class_name Life
extends RefCounted
## Personality, preferences, skills, wishes, goals, relationships, mood and history. Pure logic (no rendering).
## Characters are Dictionaries; Sim calls these hooks and the UI reads the resulting fields.

const SEASONS := ["Spring", "Summer", "Autumn", "Winter"]


static func date_text(d: Dictionary) -> String:
	return "%s %d" % [SEASONS[int(d.season)], int(d.year)]


static func _flat(c: Dictionary, key: String) -> float:
	var m := 1.0
	for t in c.traits:
		var tr: Dictionary = GameData.traits[t]
		if tr.has(key):
			m *= float(tr[key])
	return m


static func _nested(c: Dictionary, group: String, key: String) -> float:
	var m := 1.0
	for t in c.traits:
		var tr: Dictionary = GameData.traits[t]
		if tr.has(group) and tr[group].has(key):
			m *= float(tr[group][key])
	return m


static func decay_mult(c: Dictionary, need: String) -> float:
	return _nested(c, "decay", need)


static func add_log(c: Dictionary, sim: Sim, text: String, icon: String = "•") -> void:
	c.history.append({"date": date_text(sim.date), "icon": icon, "text": text, "live": true})


static func init_life(c: Dictionary, def: Dictionary, sim: Sim) -> void:
	c.bio = def.bio
	c.traits = def.traits
	c.likes = def.likes
	c.dislikes = def.dislikes
	c.job = def.job
	c.dream = def.dream
	c.skills = {}
	for k in GameData.skills:
		c.skills[k] = {"level": int(def.skills.get(k, 0)), "xp": 0.0}
	c.rel = {}
	for r in def.get("relations", []):
		c.rel[r["with"]] = r.duplicate()
	c.goals = []
	for g in def.goals:
		var goal: Dictionary = g.duplicate(true)
		goal.state = "active"
		for st in goal.steps:
			st.done = false
		c.goals.append(goal)
	c.history = []
	for h in def.history:
		c.history.append(h.duplicate())
	c.stats = {"tags": {}}
	c.wishes = []
	c.mood = 0.7
	c.boost = 0.0
	c.together_t = 0.0
	c.session = null
	c.goal_timer = 0.0
	while c.wishes.size() < 3:
		_add_wish(c)


## Multiplier on how much this person favours an activity (liked x2.2, disliked x0.3, trait weights).
static func preference_weight(c: Dictionary, tags: Array) -> float:
	var w := 1.0
	for t in tags:
		if c.likes.has(t):
			w *= 2.2
		if c.dislikes.has(t):
			w *= 0.3
		w *= _nested(c, "weights", t)
	return w


# ---- wishes ----------------------------------------------------------------------------------------------------
static func _add_wish(c: Dictionary) -> void:
	var have := {}
	for w in c.wishes:
		have[w.id] = true
	var cands: Array = []
	for w in GameData.wishes:
		if not have.has(w.id) and not c.dislikes.has(w.tag):
			cands.append(w)
	if cands.is_empty():
		return
	var weights: Array[float] = []
	var total := 0.0
	for w in cands:
		var liked := 3.0 if c.likes.has(w.tag) else 0.0
		var need_v: float = c.needs.get(w.need, 0.6)
		var wt := (1.0 + liked) * (1.0 + (1.0 - need_v) * 2.5) * (1.3 if w.tag == "together" else 1.0)
		weights.append(wt)
		total += wt
	var r := randf() * total
	var pick: Dictionary = cands[cands.size() - 1]
	for i in cands.size():
		r -= weights[i]
		if r <= 0.0:
			pick = cands[i]
			break
	c.wishes.append({"id": pick.id, "text": pick.text, "tag": pick.tag, "done": false, "done_at": 0.0})


static func _lower_first(s: String) -> String:
	return s.substr(0, 1).to_lower() + s.substr(1)


static func _fulfil(c: Dictionary, sim: Sim, tag: String) -> void:
	for w in c.wishes:
		if not w.done and w.tag == tag:
			w.done = true
			w.done_at = sim.time
			c.boost = minf(1.0, c.boost + 0.6)
			add_log(c, sim, "Wish fulfilled: %s." % _lower_first(w.text), "⭐")
			return


# ---- sessions (time spent using a piece of furniture) ----------------------------------------------------------
static func _start_session(c: Dictionary) -> void:
	var def: Dictionary = GameData.furniture[c.use.item.def]
	c.session = {"def": c.use.item.def, "tags": def.get("tags", []), "trains": def.get("trains", ""), "t": 0.0}


static func end_session(c: Dictionary, sim: Sim) -> void:
	var s: Variant = c.session
	c.session = null
	if s == null or s.t < 5.0:
		return
	for t in s.tags:
		c.stats.tags[t] = int(c.stats.tags.get(t, 0)) + 1
		_fulfil(c, sim, t)


static func _train_skill(c: Dictionary, sim: Sim, key: String, dt: float) -> void:
	var sk: Dictionary = c.skills.get(key, {})
	if sk.is_empty() or sk.level >= 10:
		return
	var liked := false
	for l in c.likes:
		if c.session.tags.has(l):
			liked = true
			break
	sk.xp += dt * _flat(c, "skillGain") * (1.2 if liked else 1.0)
	var need: float = 40.0 * (int(sk.level) + 1)
	if sk.xp >= need:
		sk.xp -= need
		sk.level += 1
		add_log(c, sim, "%s improved to level %d." % [GameData.skills[key].name, sk.level], GameData.skills[key].icon)


# ---- goals -----------------------------------------------------------------------------------------------------
static func step_progress(c: Dictionary, sim: Sim, st: Dictionary) -> Dictionary:
	var k: Dictionary = st.check
	if k.has("skill"):
		return {"cur": int(c.skills[k.skill].level), "max": int(k.level)}
	if k.has("tag"):
		return {"cur": mini(int(k.n), int(c.stats.tags.get(k.tag, 0))), "max": int(k.n)}
	if k.has("aff"):
		var r: Dictionary = sim.get_char(c.id).rel.get(k.aff["with"], {})
		return {"cur": roundi(float(r.get("aff", 0.0))), "max": int(k.aff.min)}
	if k.has("flag"):
		return {"cur": 1 if sim.flags.get(k.flag, false) else 0, "max": 1, "flag": true}
	return {"cur": 0, "max": 1}


static func _check_goals(c: Dictionary, sim: Sim) -> void:
	for g in c.goals:
		if g.state != "active":
			continue
		var all_done := true
		for st in g.steps:
			if not st.done:
				var p := step_progress(c, sim, st)
				if p.cur >= p.max:
					st.done = true
					add_log(c, sim, "Goal step done (%s): %s." % [g.title, _lower_first(st.text)], "🎯")
			if not st.done:
				all_done = false
		if all_done:
			g.state = "done"
			add_log(c, sim, "Achieved a life goal: %s!" % g.title, "🏆")
			c.boost = 1.0


# ---- per-frame -------------------------------------------------------------------------------------------------
static func tick(c: Dictionary, dt: float, sim: Sim) -> void:
	# activity session + skill training + like/dislike feelings
	if c.mode == "use" and c.use != null:
		if c.session == null:
			_start_session(c)
		c.session.t += dt
		if c.session.trains != "":
			_train_skill(c, sim, c.session.trains, dt)
		for t in c.session.tags:
			if c.likes.has(t):
				c.boost = minf(1.0, c.boost + dt * 0.05)
				c.needs.fun = minf(1.0, c.needs.fun + dt * 0.02)
			if c.dislikes.has(t):
				c.boost = maxf(-0.5, c.boost - dt * 0.04)
	# company: relationships grow, clashes sour them
	var near := false
	for o in sim.chars:
		if o == c:
			continue
		if not c.rel.has(o.id):
			continue
		var r: Dictionary = c.rel[o.id]
		var d2: float = (o.x - c.x) * (o.x - c.x) + (o.z - c.z) * (o.z - c.z)
		if d2 < 6.25:
			near = true
			var sharing: bool = c.mode == "use" and o.mode == "use" and c.session != null and o.session != null \
				and c.session.tags.has("socializing") and o.session.tags.has("socializing")
			r.aff = clampf(r.aff + dt * 0.004 * _flat(c, "relGain") * (3.0 if sharing else 1.0), -100.0, 100.0)
		if d2 < 25.0 and o.mode == "use" and o.session != null:
			var clash := false
			for t in o.session.tags:
				if c.dislikes.has(t):
					clash = true
					break
			if clash:
				r.aff = clampf(r.aff - dt * 0.006, -100.0, 100.0)
				c.boost = maxf(-0.5, c.boost - dt * 0.015)
	if near:
		c.together_t += dt
		if c.together_t > 90.0:
			c.together_t = 0.0
			_fulfil(c, sim, "together")
	else:
		c.together_t = maxf(0.0, c.together_t - dt * 0.2)
	c.boost += (0.0 - c.boost) * minf(1.0, dt * 0.01)
	# mood from needs + recent joy
	var sum := 0.0
	var worst := 1.0
	for v in c.needs.values():
		sum += v
		worst = minf(worst, v)
	c.mood = clampf(sum / 5.0 * 0.62 + worst * 0.13 + 0.05 + c.boost * 0.2, 0.0, 1.0)
	# wishes refresh
	for i in range(c.wishes.size() - 1, -1, -1):
		if c.wishes[i].done and sim.time - c.wishes[i].done_at > 7.0:
			c.wishes.remove_at(i)
	if c.wishes.size() < 3 and fmod(sim.time, 1.0) < dt:
		_add_wish(c)
	c.goal_timer -= dt
	if c.goal_timer <= 0.0:
		c.goal_timer = 1.0
		_check_goals(c, sim)


static func mood_label(m: float) -> String:
	if m > 0.82: return "Delighted"
	if m > 0.64: return "Content"
	if m > 0.46: return "Fine"
	if m > 0.3: return "Uneasy"
	return "Miserable"


static func bond_label(a: float) -> String:
	if a > 85.0: return "Devoted"
	if a > 65.0: return "Close"
	if a > 35.0: return "Friendly"
	if a > 10.0: return "Acquainted"
	if a > -20.0: return "Distant"
	return "Strained"


static func advance_date(d: Dictionary) -> void:
	d.day += 1
	if d.day > 30:
		d.day = 1
		d.season = (int(d.season) + 1) % 4
		if d.season == 0:
			d.year += 1
