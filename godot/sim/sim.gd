class_name Sim
extends RefCounted
## Headless simulation: characters, movement, furniture use. No rendering. Ported 1:1 from src/sim/sim.js.

const DECAY_SECONDS := {"hunger": 240.0, "social": 300.0, "hygiene": 360.0, "fun": 260.0, "sleep": 420.0}
const RESTORE := 0.07

var house: Dictionary
var items: Array = []
var nav: NavGrid
var occupied: Dictionary = {}  # "item:slot" -> character id
var selected_id := ""
var hour := 12.0
var time := 0.0
var flags: Dictionary = {}
var date: Dictionary
var chars: Array = []


static func ang_diff(a: float, b: float) -> float:
	var d := fmod(b - a, TAU)
	if d > PI: d -= TAU
	if d < -PI: d += TAU
	return d


static func ease_t(t: float) -> float:
	return t * t * (3.0 - 2.0 * t)


static func to_world(it: Dictionary, lx: float, lz: float) -> Vector2:
	var r: float = it.get("rot", 0.0)
	var c := cos(r)
	var s := sin(r)
	return Vector2(it.x + lx * c + lz * s, it.z - lx * s + lz * c)


func _init(p_house: Dictionary, family: Array) -> void:
	house = p_house
	date = GameData.start_date.duplicate()
	var idx := 0
	for it in house.items:
		var d: Dictionary = it.duplicate()
		d.index = idx
		items.append(d)
		idx += 1
	nav = NavGrid.build(house, GameData.furniture)
	for f in family:
		var p: Vector2 = nav.nearest_walkable(f.start.x, f.start.z)
		var needs := {}
		for n in GameData.needs:
			needs[n] = randf_range(0.45, 0.9)
		chars.append({
			"id": f.id, "name": f.name, "role": f.role, "age": f.age, "scale": f.scale, "headScale": f.headScale,
			"species": f.get("species", "human"), "look": f.look,
			"x": p.x, "z": p.y, "y": 0.0, "yaw": f.start.yaw, "speed": 1.5 * (0.6 + 0.4 * float(f.scale)),
			"mode": "idle", "path": [], "pending": null, "use": null, "queued": null, "slot_key": "", "tween": null,
			"last_use": "", "needs": needs, "pose": {"kind": "stand", "anim": "none"}, "activity": "",
			"idle_timer": randf_range(1, 4), "use_timer": 0.0, "emote": "",
		})
	for i in chars.size():
		Life.init_life(chars[i], family[i], self)


func get_char(id: String) -> Variant:
	for c in chars:
		if c.id == id:
			return c
	return null


func select(id: String) -> void:
	var prev: Variant = get_char(selected_id)
	selected_id = id
	if prev != null and prev.id != id and prev.mode == "use":
		prev.use_timer = randf_range(4, 8)


# ---- commands --------------------------------------------------------------
func command_move(c: Dictionary, x: float, z: float) -> bool:
	_cancel_pending(c)
	if c.mode == "use" or c.mode == "enter" or c.mode == "exit":
		c.queued = {"type": "move", "x": x, "z": z}
		if c.mode != "exit":
			_begin_exit(c)
		return true
	return _start_move(c, x, z)


func command_use(c: Dictionary, item_index: int) -> bool:
	var r: Variant = _resolve_use(c, item_index)
	if r == null:
		return false
	var key := "%d:%d" % [r.item.index, r.slot_idx]
	if (c.mode == "use" or c.mode == "enter") and c.use != null and c.slot_key == key:
		return true
	_cancel_pending(c)
	if c.mode == "use" or c.mode == "enter" or c.mode == "exit":
		c.queued = {"type": "use", "item_index": item_index}
		if c.mode != "exit":
			_begin_exit(c)
		return true
	c.slot_key = key
	occupied[c.slot_key] = c.id
	var u: Dictionary = r.def.use
	var slot: Dictionary = u.slots[r.slot_idx]
	var ax: float = float(u.approach[0]) + (float(slot.x) if u.get("relX", false) else 0.0)
	var approach := to_world(r.item, ax, float(u.approach[1]))
	var stand: Variant = nav.nearest_walkable(approach.x, approach.y)
	if stand == null:
		stand = approach
	var pend: Dictionary = r.duplicate()
	pend.stand = stand
	c.pending = pend
	if not _start_move(c, stand.x, stand.y, true):
		_release(c)
		c.pending = null
		return false
	return true


# ---- internals -------------------------------------------------------------
func _resolve_use(c: Dictionary, item_index: int) -> Variant:
	var item: Dictionary = items[item_index]
	var def: Dictionary = GameData.furniture[item.def]
	if not def.has("use"):
		return null
	var target: Variant = item
	if def.use.has("redirect"):
		var best := INF
		target = null
		for it in items:
			if it.def != def.use.redirect or _free_slot(it, c) < 0:
				continue
			var d: float = (it.x - c.x) * (it.x - c.x) + (it.z - c.z) * (it.z - c.z)
			if d < best:
				best = d
				target = it
		if target == null:
			return null
		def = GameData.furniture[target.def]
	var slot_idx := _free_slot(target, c)
	if slot_idx < 0:
		return null
	return {"item": target, "def": def, "slot_idx": slot_idx, "label": def.use.activity}


func _free_slot(item: Dictionary, c: Dictionary) -> int:
	var u: Dictionary = GameData.furniture[item.def].get("use", {})
	var slots: Array = u.get("slots", [])
	for i in slots.size():
		var who: String = occupied.get("%d:%d" % [item.index, i], "")
		if who == "" or who == c.id:
			return i
	return -1


func _release(c: Dictionary) -> void:
	if c.slot_key != "":
		occupied.erase(c.slot_key)
		c.slot_key = ""


func _cancel_pending(c: Dictionary) -> void:
	if c.pending != null:
		_release(c)
		c.pending = null


func _start_move(c: Dictionary, x: float, z: float, keep_pending: bool = false) -> bool:
	if not keep_pending:
		c.pending = null
	var path: Variant = nav.find_path(Vector2(c.x, c.z), Vector2(x, z))
	c.path = path if path != null else []
	c.mode = "walk" if c.path.size() > 0 else "idle"
	if c.mode == "idle":
		c.idle_timer = randf_range(1, 3)
	return path != null


func _begin_enter(c: Dictionary) -> void:
	var p: Dictionary = c.pending
	var u: Dictionary = p.def.use
	var slot: Dictionary = u.slots[p.slot_idx]
	var lz: float = slot.z
	var y: float = u.get("floorY", 0.0)
	var cs: float = c.scale
	if u.pose == "sit":
		y = float(u.seatTop) - 0.5 * cs + 0.02
	if u.pose == "sleep":
		lz = -0.62 + 1.2 * cs
		y = 0.5 + 0.13 * cs
	var w := to_world(p.item, slot.x, lz)
	c.use = p.duplicate()
	c.use.exit = p.stand
	c.last_use = p.item.def
	c.pending = null
	c.pose = {"kind": u.pose, "anim": u.get("anim", "none")}
	c.activity = p.label
	c.tween = {"t": 0.0, "dur": 0.9 if u.pose == "sleep" else 0.6,
		"from": {"x": c.x, "z": c.z, "y": c.y, "yaw": c.yaw},
		"to": {"x": w.x, "z": w.y, "y": y, "yaw": float(p.item.get("rot", 0.0)) + float(u.face)}}
	c.mode = "enter"


func _begin_exit(c: Dictionary) -> void:
	Life.end_session(c, self)
	var ex: Variant = c.use.exit if c.use != null else Vector2(c.x, c.z)
	c.tween = {"t": 0.0, "dur": 0.5, "from": {"x": c.x, "z": c.z, "y": c.y, "yaw": c.yaw},
		"to": {"x": ex.x, "z": ex.y, "y": 0.0, "yaw": c.yaw}}
	c.mode = "exit"
	c.pose = {"kind": "stand", "anim": "none"}
	c.activity = ""
	_release(c)


func _step_tween(c: Dictionary, dt: float) -> bool:
	var tw: Dictionary = c.tween
	tw.t += dt / tw.dur
	var k := ease_t(minf(1.0, tw.t))
	c.x = tw.from.x + (tw.to.x - tw.from.x) * k
	c.z = tw.from.z + (tw.to.z - tw.from.z) * k
	c.y = tw.from.y + (tw.to.y - tw.from.y) * k
	c.yaw = tw.from.yaw + ang_diff(tw.from.yaw, tw.to.yaw) * k
	return tw.t >= 1.0


func _urgency(c: Dictionary, def: Dictionary) -> float:
	var a := 0.0
	for n in def.needs:
		a += float(def.needs[n]) * pow(1.0 - c.needs[n], 2.0)
	return a


func _saturated(c: Dictionary, def: Dictionary) -> bool:
	for n in def.needs:
		if float(def.needs[n]) >= 0.4 and c.needs[n] <= 0.86:
			return false
	return true


func _choose_auto(c: Dictionary) -> void:
	var night := hour >= 21.0 or hour < 6.5
	var options: Array = []
	for it in items:
		var def: Dictionary = GameData.furniture[it.def]
		if not def.has("use"):
			continue
		var redirect: String = def.use.get("redirect", "")
		var tdef: Dictionary = GameData.furniture[redirect] if redirect != "" else def
		if redirect != "":
			var any_free := false
			for o in items:
				if o.def == redirect and _free_slot(o, c) >= 0:
					any_free = true
					break
			if not any_free:
				continue
		elif _free_slot(it, c) < 0:
			continue
		var w := (0.03 + _urgency(c, tdef) * 4.0) * Life.preference_weight(c, tdef.get("tags", []))
		if c.last_use == (redirect if redirect != "" else it.def):
			w *= 0.15  # variety: don't repeat the same thing back to back
		if it.def == "bed":
			w *= 3.0 if night else 0.25
		options.append({"w": w, "it": it})
	options.append({"w": 0.25, "wander": "room"})
	options.append({"w": 0.08, "wander": "garden"})
	# desperate: take the single most urgent option outright
	var worst := 1.0
	for n in GameData.needs:
		worst = minf(worst, c.needs[n])
	var pick: Variant = null
	if worst < 0.15:
		var best_w := -INF
		for o in options:
			if o.has("it") and o.w > best_w:
				best_w = o.w
				pick = o
	if pick == null:
		var total := 0.0
		for o in options:
			total += o.w
		var r := randf() * total
		pick = options[options.size() - 1]
		for o in options:
			r -= o.w
			if r <= 0.0:
				pick = o
				break
	if pick.has("it"):
		if command_use(c, pick.it.index):
			return
	var room: Dictionary = house.room
	var bounds: Dictionary = house.bounds
	var garden: bool = pick.get("wander", "") == "garden"
	for i in 20:
		var x := randf_range(bounds.x0, bounds.x1) if garden else randf_range(room.x0, room.x1)
		var z := randf_range(bounds.z0, bounds.z1) if garden else randf_range(room.z0, room.z1)
		if nav.walkable(x, z) and (garden or (x > room.x0 and x < room.x1)):
			_start_move(c, x, z)
			return
	c.idle_timer = randf_range(1, 3)


func _update_needs(c: Dictionary, dt: float) -> void:
	for n in GameData.needs:
		c.needs[n] = maxf(0.0, c.needs[n] - dt * Life.decay_mult(c, n) / DECAY_SECONDS[n])
	# company: being near another person slowly restores social
	for o in chars:
		if o != c and (o.x - c.x) * (o.x - c.x) + (o.z - c.z) * (o.z - c.z) < 6.0:
			c.needs.social = minf(1.0, c.needs.social + dt * 0.012)
			break
	if c.mode == "use" and c.use != null:
		var fneeds: Dictionary = GameData.furniture[c.use.item.def].needs
		for n in fneeds:
			c.needs[n] = minf(1.0, c.needs[n] + dt * RESTORE * float(fneeds[n]) * (1.1 if n == "sleep" else 1.0))
	Life.tick(c, dt, self)


func set_flag(name: String, v: bool = true) -> void:
	flags[name] = v


func advance_day() -> void:
	Life.advance_date(date)


func update(dt: float) -> void:
	time += dt
	for c in chars:
		_update_needs(c, dt)
		var selected: bool = c.id == selected_id
		match c.mode:
			"walk":
				var wp: Vector2 = c.path[0]
				var dx: float = wp.x - c.x
				var dz: float = wp.y - c.z
				var dist := sqrt(dx * dx + dz * dz)
				var step: float = c.speed * dt
				if dist > 0.001:
					c.yaw += ang_diff(c.yaw, atan2(dx, dz)) * minf(1.0, dt * 12.0)
				if dist <= step:
					c.x = wp.x
					c.z = wp.y
					c.path.remove_at(0)
					if c.path.is_empty():
						if c.pending != null:
							_begin_enter(c)
						else:
							c.mode = "idle"
							c.idle_timer = randf_range(2, 6)
				else:
					c.x += dx / dist * step
					c.z += dz / dist * step
			"enter":
				if _step_tween(c, dt):
					c.mode = "use"
					c.use_timer = 60.0 if c.pose.kind == "sleep" else 30.0
			"use":
				if not selected:
					c.use_timer -= dt
					if c.use_timer <= 0.0 or _saturated(c, GameData.furniture[c.use.item.def]):
						_begin_exit(c)
			"exit":
				if _step_tween(c, dt):
					c.mode = "idle"
					c.use = null
					c.idle_timer = randf_range(1, 3)
					var q: Variant = c.queued
					c.queued = null
					if q != null:
						if q.type == "move":
							_start_move(c, q.x, q.z)
						elif q.type == "use":
							command_use(c, q.item_index)
			"idle":
				if not selected:
					c.idle_timer -= dt
					if c.idle_timer <= 0.0:
						_choose_auto(c)
