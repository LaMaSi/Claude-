class_name CamRig
extends Node
## Camera rig: fixed angle, pinch/wheel zoom about the touch point, one-finger pan, tap detection.
## Ported from src/input.js. Zoom divides the orthographic size.

signal tapped(pos: Vector2)

const MIN_ZOOM := 0.8
const MAX_ZOOM := 4.5

var camera: Camera3D
var base: Vector3
var offset: Vector3
var target: Vector3
var goal: Vector3
var zoom := 1.0
var goal_zoom := 1.0
var focusing := false
var base_size := 17.0
var tap_slop := 27.0       # px of movement before a touch counts as a drag
var ui_blocks: Callable        # (Vector2) -> bool: true when a touch lands on UI
var _ignored: Dictionary = {}
var _pts: Dictionary = {}
var _tap: Variant = null
var _last_dist := 0.0
var _last_mid := Vector2.ZERO


func setup(p_camera: Camera3D, p_base: Vector3, p_offset: Vector3) -> void:
	camera = p_camera
	base = p_base
	offset = p_offset
	target = base
	goal = base
	apply()


func apply() -> void:
	camera.size = base_size / zoom
	camera.position = target + offset
	camera.look_at(target, Vector3.UP)


func ground(p: Vector2) -> Variant:
	var o := camera.project_ray_origin(p)
	var d := camera.project_ray_normal(p)
	if absf(d.y) < 1e-6:
		return null
	var t := -o.y / d.y
	return o + d * t


func _clamp(v: Vector3) -> Vector3:
	var lim := maxf(0.0, (1.0 - 1.0 / zoom) * 7.5)
	v.x = clampf(v.x, base.x - lim, base.x + lim)
	v.z = clampf(v.z, base.z - lim * 0.9, base.z + lim * 0.9)
	return v


func zoom_at(factor: float, p: Vector2) -> void:
	var before: Variant = ground(p)
	zoom = clampf(zoom * factor, MIN_ZOOM, MAX_ZOOM)
	apply()
	var after: Variant = ground(p)
	if before != null and after != null:
		target.x += before.x - after.x
		target.z += before.z - after.z
	target = _clamp(target)
	apply()


func pan_by(a: Vector2, b: Vector2) -> void:
	var ga: Variant = ground(a)
	var gb: Variant = ground(b)
	if ga == null or gb == null:
		return
	target.x += ga.x - gb.x
	target.z += ga.z - gb.z
	target = _clamp(target)
	apply()


## Smoothly bring a ground point to the view centre (only meaningful when zoomed in).
func focus(x: float, z: float, min_zoom: float = 1.8) -> void:
	goal = Vector3(x, base.y, z)
	goal_zoom = maxf(zoom, min_zoom)
	focusing = true


func refit(size: float) -> void:
	base_size = size
	apply()


func _mid() -> Vector2:
	var v: Array = _pts.values()
	return (v[0] + v[1]) / 2.0


func _dist() -> float:
	var v: Array = _pts.values()
	return (v[0] as Vector2).distance_to(v[1])


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventScreenTouch:
		var t := e as InputEventScreenTouch
		if t.pressed and ui_blocks.is_valid() and ui_blocks.call(t.position):
			_ignored[t.index] = true   # a button/panel owns this finger
			return
		if not t.pressed and _ignored.has(t.index):
			_ignored.erase(t.index)
			return
		if t.pressed:
			_pts[t.index] = t.position
			focusing = false
			if _pts.size() == 1:
				_tap = {"pos": t.position, "t": Time.get_ticks_msec(), "moved": false}
			else:
				_tap = null
				_last_dist = _dist()
				_last_mid = _mid()
		else:
			if _tap != null and _pts.size() == 1 and not _tap.moved and Time.get_ticks_msec() - _tap.t < 600 and not t.canceled:
				tapped.emit(t.position)
			_pts.erase(t.index)
			_tap = null
			if _pts.size() == 1:
				_last_dist = 0.0
	elif e is InputEventScreenDrag:
		var d := e as InputEventScreenDrag
		if _ignored.has(d.index) or not _pts.has(d.index):
			return
		var prev: Vector2 = _pts[d.index]
		_pts[d.index] = d.position
		if _pts.size() == 1:
			if _tap != null and not _tap.moved and d.position.distance_to(_tap.pos) > tap_slop:
				_tap.moved = true
			if _tap != null and _tap.moved:
				pan_by(prev, d.position)
		elif _pts.size() == 2:
			var dist := _dist()
			var mid := _mid()
			if _last_dist > 0.0:
				zoom_at(dist / _last_dist, _last_mid)
			pan_by(_last_mid, mid)
			_last_dist = dist
			_last_mid = mid
	elif e is InputEventMouseButton:
		var m := e as InputEventMouseButton
		if m.pressed and (m.button_index == MOUSE_BUTTON_WHEEL_UP or m.button_index == MOUSE_BUTTON_WHEEL_DOWN):
			focusing = false
			zoom_at(1.12 if m.button_index == MOUSE_BUTTON_WHEEL_UP else 1.0 / 1.12, m.position)


func update(dt: float) -> void:
	if not focusing:
		return
	var k := 1.0 - exp(-dt * 6.0)
	zoom += (goal_zoom - zoom) * k
	goal = _clamp(goal)
	target.x += (goal.x - target.x) * k
	target.z += (goal.z - target.z) * k
	target = _clamp(target)
	apply()
