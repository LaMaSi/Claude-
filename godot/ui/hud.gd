class_name Hud
extends CanvasLayer
## Bottom-docked UI: portrait row (thumb zone), a tabbed character panel above it, and a small clock top-right.
## Ported from index.html + src/ui.js + src/ui_tabs.js (carved-wood panels with a gold inlay line).

signal portrait_pressed(id: String)
signal hour_changed(hour: float)
signal auto_toggled(on: bool)
signal pixel_changed(enabled: bool, cell: float)

const S := 2.7   # one CSS pixel of the web UI in viewport pixels (the 1080-wide viewport ~ a 390px-wide phone)
const GOLD := Color("c9a24c")
const GOLDHI := Color("f0cd76")
const TEXT := Color("ecdcb4")
const DIM := Color("b9a77e")
const NOTE := Color("cdbb90")
const WOOD1 := Color("1d1510")
const WOOD2 := Color("2f2218")
const GOOD := Color("8fd18f")
const BAD := Color("e07a6e")
const ICON := {"hunger": "🍖", "social": "💬", "hygiene": "🧼", "fun": "🎲", "sleep": "🌙"}
const LABEL := {"hunger": "Hunger", "social": "Social", "hygiene": "Hygiene", "fun": "Fun", "sleep": "Rest"}
const TABS := [
	["needs", "gi:cauldron", "Needs"], ["bonds", "💞", "Bonds"], ["wishes", "⭐", "Wishes"], ["likes", "❤️", "Likes"],
	["skills", "🛡️", "Skills"], ["work", "🔨", "Work"], ["past", "📜", "Past"]]

var sim: Sim
var portraits: Dictionary = {}
var title_font: FontVariation
var body_font: FontVariation
var icon_map: Dictionary = {}
var open := false
var tab := "needs"
var _last_sig := ""
var _last_face := -1
var _acc := 0.0
var auto_on := false

var root: Control
var clock_btn: Button
var play_btn: Button
var status_pill: PanelContainer
var status_lbl: Label
var panel: PanelContainer
var pname: Label
var prole: Label
var pact: Label
var tab_btns: Dictionary = {}
var pbody: ScrollContainer
var pane_needs: VBoxContainer
var pane_dyn: VBoxContainer
var mood_icon: TextureRect
var mood_text: RichTextLabel
var mood_bar: Bar
var vials: Dictionary = {}
var port_btns: Dictionary = {}
var time_pop: PanelContainer
var date_lbl: Label
var time_slider: HSlider
var opt_pop: PanelContainer
var dock_box: VBoxContainer
var _safe_bottom := 0.0
var _layout_key := Vector4.ZERO
var _px_sw: CheckButton
var _px_cell := 3


# ---- small widgets ----------------------------------------------------------------------------------------------
class Bar extends Control:
	var frac := 0.5
	var fill := Color("86a35a")
	var back := Color("120c08")
	var edge := Color("6b4f28")
	var border := 3.0
	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), edge)
		var inner := Rect2(Vector2(border, border), size - Vector2(border, border) * 2.0)
		draw_rect(inner, back)
		draw_rect(Rect2(inner.position, Vector2(inner.size.x * clampf(frac, 0.0, 1.0), inner.size.y)), fill)


class Vial extends Control:
	var frac := 0.5
	var state := 0   # 0 ok, 1 mid, 2 low
	var pulse := 0.0
	func _process(delta: float) -> void:
		if state == 2:
			pulse += delta
			queue_redraw()
	func _draw() -> void:
		var col := Color("86a35a") if state == 0 else (Color("d09a3c") if state == 1 else Color("b24a3c"))
		var edge := Color("6b4f28")
		if state == 2:
			edge = edge.lerp(Color("de5a4c"), 0.5 + 0.5 * sin(pulse * 5.7))
		draw_rect(Rect2(Vector2.ZERO, size), edge)
		var b := 8.0
		var inner := Rect2(Vector2(b, b), size - Vector2(b, b) * 2.0)
		draw_rect(inner, Color("120c08"))
		var h := inner.size.y * clampf(frac, 0.0, 1.0)
		draw_rect(Rect2(inner.position.x, inner.end.y - h, inner.size.x, h), col)
		var y := inner.end.y - 9.0 * Hud.S
		while y > inner.position.y:   # carved measuring notches
			draw_rect(Rect2(inner.position.x, y, inner.size.x, 2.0 * Hud.S), Color(0.03, 0.02, 0.01, 0.55))
			y -= 11.0 * Hud.S
		draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, 0), false, 1.0)


class Check extends Control:
	var done := false
	func _draw() -> void:
		var c := size / 2.0
		var r := minf(size.x, size.y) * 0.38
		if done:
			draw_arc(c, r, 0, TAU, 20, Color("f0cd76"), 3.0)
			draw_polyline(PackedVector2Array([c + Vector2(-r * 0.5, 0), c + Vector2(-r * 0.1, r * 0.45), c + Vector2(r * 0.6, -r * 0.4)]), Color("8fd18f"), 4.0)
		else:
			draw_arc(c, r, 0, TAU, 20, Color("a99872"), 2.5)


class Pips extends Control:
	var level := 0
	func _draw() -> void:
		var w := 15.0 * Hud.S
		var h := 8.0 * Hud.S
		for i in 10:
			var r := Rect2(i * (w + 3.0 * Hud.S), 0, w, h)
			draw_rect(r, Color("8a6a32"))
			draw_rect(r.grow(-2.0), Color("f0cd76") if i < level else Color(0, 0, 0, 0.5))


func _wood(radius: float = 14.0, bg: Color = WOOD1) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg.lerp(WOOD2, 0.35)
	sb.set_border_width_all(int(2.0 * S))
	sb.border_color = GOLD
	sb.set_corner_radius_all(int(radius * S))
	sb.shadow_color = Color(0, 0, 0, 0.55)
	sb.shadow_size = int(8.0 * S)
	sb.shadow_offset = Vector2(0, 3.0 * S)
	sb.set_content_margin_all(6.0 * S)
	return sb


func _flat(bg: Color, border: Color = Color(0, 0, 0, 0), bw: float = 0.0, radius: float = 8.0, margin: float = 4.0) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(int(bw * S))
	sb.set_corner_radius_all(int(radius * S))
	sb.set_content_margin_all(margin * S)
	return sb


func _lbl(text: String, size: float = 13.0, color: Color = TEXT, title: bool = false) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", title_font if title else body_font)
	l.add_theme_font_size_override("font_size", int(size * S))
	l.add_theme_color_override("font_color", color)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _wrap(text: String, size: float = 12.5, color: Color = NOTE) -> Label:
	var l := _lbl(text, size, color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l


func _icon_tex(key: String) -> Texture2D:
	var name := key
	if key.begins_with("gi:"):
		name = key.substr(3)
	elif icon_map.has(key):
		name = icon_map[key]
	else:
		return null
	var path := "res://ui/icons/%s.svg" % name
	return load(path) if ResourceLoader.exists(path) else null


func _ico(key: String, size: float = 22.0, tint: Color = Color.WHITE) -> Control:
	var tex := _icon_tex(key)
	if tex == null:
		return _lbl(key, size * 0.8, GOLDHI)
	var t := TextureRect.new()
	t.texture = tex
	t.custom_minimum_size = Vector2.ONE * size * S
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	t.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	t.modulate = tint
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t


func _h4(text: String, dim: String = "") -> Control:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", int(6 * S))
	h.add_child(_lbl(text, 17, GOLDHI, true))
	if dim != "":
		h.add_child(_lbl(dim, 12, DIM))
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return h


func _card(border: Color = Color(0.79, 0.64, 0.30, 0.4), dashed: bool = false) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", _flat(Color(0, 0, 0, 0.28), border, 1.0, 12.0, 9.0))
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return p


func _bar(frac: float, fill: Color, h: float = 9.0) -> Bar:
	var b := Bar.new()
	b.frac = frac
	b.fill = fill
	b.border = 2.0 * S
	b.custom_minimum_size = Vector2(0, h * S)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return b


func _vbox(sep: float = 4.0) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", int(sep * S))
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return v


func _hbox(sep: float = 8.0) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", int(sep * S))
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return h


func _spacer() -> Control:
	var c := Control.new()
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c


func _pill_button(text: String) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_override("font", title_font)
	b.add_theme_font_size_override("font_size", int(15 * S))
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(c, GOLDHI)
	var sb := _wood(999.0)
	sb.set_content_margin(SIDE_LEFT, 13.0 * S)
	sb.set_content_margin(SIDE_RIGHT, 13.0 * S)
	sb.set_content_margin(SIDE_TOP, 5.0 * S)
	sb.set_content_margin(SIDE_BOTTOM, 5.0 * S)
	for st in ["normal", "hover", "pressed", "focus"]:
		b.add_theme_stylebox_override(st, sb)
	b.focus_mode = Control.FOCUS_NONE
	return b


# ---- construction ------------------------------------------------------------------------------------------------
func setup(p_sim: Sim, p_portraits: Dictionary) -> void:
	sim = p_sim
	portraits = p_portraits
	var f: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/icons.json"))
	icon_map = f if f is Dictionary else {}
	title_font = FontVariation.new()
	title_font.base_font = load("res://ui/fonts/Alegreya.ttf")
	title_font.variation_opentype = {0x77676874: 800}
	body_font = FontVariation.new()
	body_font.base_font = load("res://ui/fonts/NunitoSans.ttf")
	body_font.variation_opentype = {0x77676874: 700}
	layer = 10

	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	# soft vignette: cosy, keeps the eye on the cottage
	var vg := ColorRect.new()
	vg.set_anchors_preset(Control.PRESET_FULL_RECT)
	vg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var vsh := Shader.new()
	vsh.code = """
shader_type canvas_item;
void fragment() {
	vec2 d = (UV - vec2(0.5, 0.42)) / vec2(0.5, 0.58);
	float r = length(d) / 1.4142;
	float a = smoothstep(0.52, 1.0, r) * 0.6;
	COLOR = vec4(3.0/255.0, 6.0/255.0, 12.0/255.0, a);
}"""
	var vm := ShaderMaterial.new()
	vm.shader = vsh
	vg.material = vm
	root.add_child(vg)

	var safe_top := 0.0
	var safe_bottom := 0.0
	var win := Vector2(DisplayServer.window_get_size())
	var sa := DisplayServer.get_display_safe_area()
	if sa.size.x > 0 and win.x > 0:
		var k := 1080.0 / win.x
		# notch / gesture-bar insets are tens of pixels; larger values mean the window is bigger than the screen
		# (desktop or a virtual display), so they are ignored rather than trusted
		var top_in := maxf(0.0, float(sa.position.y)) * k
		var bot_in := maxf(0.0, win.y - float(sa.end.y)) * k
		safe_top = top_in if top_in <= 160.0 else 0.0
		safe_bottom = bot_in if bot_in <= 160.0 else 0.0

	_build_top(safe_top)
	_build_dock(safe_bottom)
	set_open(false)
	set_tab("needs")


func _build_top(safe_top: float) -> void:
	var box := VBoxContainer.new()
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_theme_constant_override("separation", int(6 * S))
	box.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	box.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	box.offset_top = 8.0 * S + safe_top
	box.offset_right = -10.0 * S
	root.add_child(box)
	var row := HBoxContainer.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", int(6 * S))
	row.alignment = BoxContainer.ALIGNMENT_END
	box.add_child(row)
	clock_btn = _pill_button("☾ 21:30")
	clock_btn.pressed.connect(func(): time_pop.visible = not time_pop.visible)
	row.add_child(clock_btn)
	var opt_btn := _pill_button("")
	opt_btn.icon = _icon_tex("gi:cog")
	opt_btn.add_theme_constant_override("icon_max_width", int(22 * S))
	opt_btn.add_theme_constant_override("h_separation", 0)
	opt_btn.pressed.connect(func(): opt_pop.visible = not opt_pop.visible)
	row.add_child(opt_btn)
	play_btn = _pill_button("Auto")
	play_btn.pressed.connect(func():
		auto_on = not auto_on
		play_btn.text = "Pause" if auto_on else "Auto"
		auto_toggled.emit(auto_on))
	row.add_child(play_btn)

	# options popup
	opt_pop = PanelContainer.new()
	opt_pop.add_theme_stylebox_override("panel", _wood(14.0))
	opt_pop.visible = false
	opt_pop.custom_minimum_size = Vector2(264 * S, 0)
	box.add_child(opt_pop)
	var ov := _vbox(4)
	opt_pop.add_child(ov)
	ov.add_child(_lbl("Options", 17, GOLDHI, true))
	var r1 := _hbox(10)
	r1.add_child(_lbl("Pixel-art look", 14, TEXT))
	r1.add_child(_spacer())
	_px_sw = CheckButton.new()
	_px_sw.focus_mode = Control.FOCUS_NONE
	_px_sw.toggled.connect(func(on: bool): pixel_changed.emit(on, float(_px_cell)))
	r1.add_child(_px_sw)
	ov.add_child(r1)
	var r2 := _hbox(6)
	r2.add_child(_lbl("Pixel size", 14, TEXT))
	r2.add_child(_spacer())
	for opt in [["Fine", 2], ["Mid", 3], ["Chunky", 4]]:
		var ob := Button.new()
		ob.text = opt[0]
		ob.focus_mode = Control.FOCUS_NONE
		ob.add_theme_font_override("font", body_font)
		ob.add_theme_font_size_override("font_size", int(12.5 * S))
		var cell: int = opt[1]
		ob.pressed.connect(func():
			_px_cell = cell
			pixel_changed.emit(_px_sw.button_pressed, float(cell)))
		r2.add_child(ob)
	ov.add_child(r2)
	var cred := _wrap("Icons: game-icons.net by Lorc, Delapouite & contributors (CC BY 3.0)", 10.5, Color("a99872"))
	ov.add_child(cred)

	# time popup
	time_pop = PanelContainer.new()
	time_pop.add_theme_stylebox_override("panel", _wood(14.0))
	time_pop.visible = false
	box.add_child(time_pop)
	var tv := _vbox(4)
	time_pop.add_child(tv)
	date_lbl = _lbl("", 14, GOLDHI, true)
	date_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tv.add_child(date_lbl)
	time_slider = HSlider.new()
	time_slider.min_value = 0.0
	time_slider.max_value = 24.0
	time_slider.step = 0.01
	time_slider.value = 21.5
	time_slider.custom_minimum_size = Vector2(200 * S, 22 * S)
	time_slider.value_changed.connect(func(v: float): hour_changed.emit(v))
	tv.add_child(time_slider)


func _build_dock(safe_bottom: float) -> void:
	dock_box = VBoxContainer.new()
	dock_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	dock_box.add_theme_constant_override("separation", int(8 * S))
	dock_box.set_anchors_preset(Control.PRESET_TOP_LEFT)   # positioned explicitly every frame by _layout()
	_safe_bottom = safe_bottom
	root.add_child(dock_box)

	status_pill = PanelContainer.new()
	var ssb := _wood(999.0)
	ssb.set_content_margin(SIDE_LEFT, 14.0 * S)
	ssb.set_content_margin(SIDE_RIGHT, 14.0 * S)
	ssb.set_content_margin(SIDE_TOP, 4.0 * S)
	ssb.set_content_margin(SIDE_BOTTOM, 4.0 * S)
	status_pill.add_theme_stylebox_override("panel", ssb)
	status_pill.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	status_lbl = _lbl("Tap a portrait", 14, Color("f6ead0"))
	status_pill.add_child(status_lbl)
	dock_box.add_child(status_pill)

	panel = PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _wood(16.0))
	panel.size_flags_horizontal = Control.SIZE_FILL
	dock_box.add_child(panel)
	var pv := _vbox(0)
	panel.add_child(pv)
	var head := _hbox(10)
	head.alignment = BoxContainer.ALIGNMENT_BEGIN
	pname = _lbl("", 24, GOLDHI, true)
	prole = _lbl("", 13, DIM)
	pact = _lbl("", 13, Color("f6ead0"))
	pact.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	var hm := MarginContainer.new()
	hm.add_theme_constant_override("margin_left", int(8 * S))
	hm.add_theme_constant_override("margin_right", int(8 * S))
	hm.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hm.add_child(head)
	head.add_child(pname)
	head.add_child(prole)
	head.add_child(_spacer())
	head.add_child(pact)
	pv.add_child(hm)

	var tabs := _hbox(2)
	for t in TABS:
		var b := Button.new()
		b.toggle_mode = true
		b.focus_mode = Control.FOCUS_NONE
		b.icon = _icon_tex(t[1])
		b.text = t[2]
		b.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		b.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
		b.expand_icon = true
		b.add_theme_constant_override("icon_max_width", int(23 * S))
		b.add_theme_constant_override("h_separation", 0)
		b.add_theme_font_override("font", body_font)
		b.add_theme_font_size_override("font_size", int(10.5 * S))
		for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color", "font_hover_pressed_color"]:
			b.add_theme_color_override(c, Color("bfae86"))
		b.add_theme_color_override("font_pressed_color", GOLDHI)
		b.add_theme_color_override("font_hover_pressed_color", GOLDHI)
		b.add_theme_stylebox_override("normal", _flat(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 10, 4))
		b.add_theme_stylebox_override("hover", _flat(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 10, 4))
		var on := _flat(Color(0.94, 0.8, 0.46, 0.08), Color(0, 0, 0, 0), 0, 10, 4)
		b.add_theme_stylebox_override("pressed", on)
		b.add_theme_stylebox_override("hover_pressed", on)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var tid: String = t[0]
		b.pressed.connect(func(): set_tab(tid))
		tabs.add_child(b)
		tab_btns[tid] = b
	var tm := MarginContainer.new()
	tm.add_theme_constant_override("margin_left", int(8 * S))
	tm.add_theme_constant_override("margin_right", int(8 * S))
	tm.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tm.add_child(tabs)
	pv.add_child(tm)
	var line := ColorRect.new()
	line.color = Color(0.79, 0.64, 0.30, 0.55)
	line.custom_minimum_size = Vector2(0, 2)
	line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pv.add_child(line)

	pbody = ScrollContainer.new()
	pbody.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	pbody.custom_minimum_size = Vector2(0, 250.0 * S)
	pbody.size_flags_vertical = Control.SIZE_EXPAND_FILL
	pv.add_child(pbody)
	var bm := MarginContainer.new()
	bm.add_theme_constant_override("margin_left", int(12 * S))
	bm.add_theme_constant_override("margin_right", int(12 * S))
	bm.add_theme_constant_override("margin_top", int(10 * S))
	bm.add_theme_constant_override("margin_bottom", int(14 * S))
	bm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pbody.add_child(bm)
	var content := _vbox(0)
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bm.add_child(content)
	pane_needs = _vbox(10)
	content.add_child(pane_needs)
	pane_dyn = _vbox(0)
	pane_dyn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(pane_dyn)

	# mood row + need vials
	var mood := _hbox(8)
	var mi := _ico("gi:face2", 24)
	mood_icon = mi as TextureRect
	mood.add_child(mi)
	mood_text = RichTextLabel.new()
	mood_text.bbcode_enabled = true
	mood_text.fit_content = true
	mood_text.scroll_active = false
	mood_text.autowrap_mode = TextServer.AUTOWRAP_OFF
	mood_text.custom_minimum_size = Vector2(150 * S, 22 * S)
	mood_text.add_theme_font_override("normal_font", body_font)
	mood_text.add_theme_font_override("bold_font", body_font)
	mood_text.add_theme_font_size_override("normal_font_size", int(14 * S))
	mood_text.add_theme_font_size_override("bold_font_size", int(14 * S))
	mood_text.add_theme_color_override("default_color", TEXT)
	mood_text.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mood.add_child(mood_text)
	mood_bar = _bar(0.7, Color("d9b05a"), 12.0)
	mood_bar.border = 3.0 * S
	mood.add_child(mood_bar)
	pane_needs.add_child(mood)
	var grid := GridContainer.new()
	grid.columns = 5
	grid.add_theme_constant_override("h_separation", int(8 * S))
	grid.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pane_needs.add_child(grid)
	for n in GameData.needs:
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", int(4 * S))
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var ic := _ico(ICON[n], 30.0)
		ic.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		v.add_child(ic)
		var vial := Vial.new()
		vial.custom_minimum_size = Vector2(34 * S, 62 * S)
		vial.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		vial.mouse_filter = Control.MOUSE_FILTER_IGNORE
		v.add_child(vial)
		var lb := _lbl(LABEL[n], 12, Color("d6c59c"))
		lb.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(lb)
		grid.add_child(v)
		vials[n] = vial

	# portrait row
	var dock := PanelContainer.new()
	var dsb := _wood(18.0)
	dsb.set_content_margin(SIDE_LEFT, 14.0 * S)
	dsb.set_content_margin(SIDE_RIGHT, 14.0 * S)
	dsb.set_content_margin(SIDE_TOP, 8.0 * S)
	dsb.set_content_margin(SIDE_BOTTOM, 5.0 * S)
	dock.add_theme_stylebox_override("panel", dsb)
	dock.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	dock_box.add_child(dock)
	var prow := _hbox(12)
	dock.add_child(prow)
	for c in sim.chars:
		prow.add_child(_make_portrait_button(c))


func _circle_avatar(id: String, size: float, border: Color, bw: float) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := _flat(Color("2a1f17"), border, bw, size / 2.0, 0.0)
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size = Vector2.ONE * size * S
	p.clip_children = CanvasItem.CLIP_CHILDREN_AND_DRAW
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var tr := TextureRect.new()
	tr.texture = portraits.get(id)
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	tr.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	tr.modulate = Color(1, 1, 1, 0.93)
	tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(tr)
	return p


func _make_portrait_button(c: Dictionary) -> Control:
	var holder := Control.new()
	holder.custom_minimum_size = Vector2(68 * S, 88 * S)
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.add_theme_constant_override("separation", int(3 * S))
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	holder.add_child(v)
	var av := _circle_avatar(c.id, 60.0, Color("5b4426"), 3.0)
	av.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(av)
	var nm := _lbl(c.name, 15, Color("cdbb90"), true)
	nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(nm)
	var alert := Panel.new()
	alert.add_theme_stylebox_override("panel", _flat(Color("de5a4c"), Color("1d1510"), 2.0, 13.0, 0.0))
	alert.custom_minimum_size = Vector2(13 * S, 13 * S)
	alert.size = Vector2(13 * S, 13 * S)
	alert.position = Vector2(51 * S, 0)
	alert.visible = false
	alert.mouse_filter = Control.MOUSE_FILTER_IGNORE
	holder.add_child(alert)
	var btn := Button.new()
	btn.flat = true
	btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	btn.focus_mode = Control.FOCUS_NONE
	btn.pressed.connect(func(): _on_portrait(c.id))
	holder.add_child(btn)
	port_btns[c.id] = {"avatar": av, "name": nm, "alert": alert}
	return holder


func _on_portrait(id: String) -> void:
	if sim.selected_id == id:
		set_open(not open)
	else:
		portrait_pressed.emit(id)
		set_open(true)
		_last_sig = ""


# ---- state -------------------------------------------------------------------------------------------------------
func set_open(v: bool) -> void:
	open = v
	panel.visible = v
	status_pill.visible = not v


func set_tab(id: String) -> void:
	tab = id
	_last_sig = ""
	for k in tab_btns:
		(tab_btns[k] as Button).set_pressed_no_signal(k == id)
	pane_needs.visible = id == "needs"
	pane_dyn.visible = id != "needs"
	pbody.scroll_vertical = 0


func _face_for(m: float) -> int:
	return 4 if m > 0.82 else (3 if m > 0.64 else (2 if m > 0.46 else (1 if m > 0.3 else 0)))


## Bottom dock: as wide as the screen up to 520 CSS px (like the web build), packed against the bottom edge.
func _layout() -> void:
	if root == null or dock_box == null:
		return
	var w := minf(root.size.x - 20.0 * S, 520.0 * S)
	var ms := dock_box.get_combined_minimum_size()
	var x := (root.size.x - w) / 2.0
	var y := root.size.y - 10.0 * S - _safe_bottom - ms.y
	# explicit offsets from the top-left anchor (assigning position/size lets the min-size clamp shift the rect)
	var key := Vector4(x, y, w, ms.y)
	if key == _layout_key:
		return   # re-assigning identical offsets still forces a relayout of the whole panel tree
	_layout_key = key
	dock_box.offset_left = x
	dock_box.offset_top = y
	dock_box.offset_right = x + w
	dock_box.offset_bottom = y + ms.y


func _process(_delta: float) -> void:
	_layout()


func update(dt: float, hour: float) -> void:
	_acc += dt
	if _acc < 0.1:
		return
	_acc = 0.0
	var h := int(floor(hour)) % 24
	var day := hour > 6.0 and hour < 19.5
	clock_btn.text = "%s %02d:%02d" % ["☀" if day else "☾", h, int(floor(fmod(hour, 1.0) * 60.0))]
	date_lbl.text = Life.date_text(sim.date)
	var sel: Variant = sim.get_char(sim.selected_id)
	for id in port_btns:
		var c: Dictionary = sim.get_char(id)
		var pb: Dictionary = port_btns[id]
		var is_sel: bool = id == sim.selected_id
		var sb := (pb.avatar as PanelContainer).get_theme_stylebox("panel") as StyleBoxFlat
		sb.border_color = GOLDHI if is_sel else Color("5b4426")
		sb.shadow_color = Color(0.94, 0.8, 0.46, 0.65) if is_sel else Color(0, 0, 0, 0)
		sb.shadow_size = int(14 * S) if is_sel else 0
		(pb.name as Label).add_theme_color_override("font_color", GOLDHI if is_sel else Color("cdbb90"))
		var warn := false
		for n in GameData.needs:
			if c.needs[n] < 0.2:
				warn = true
		(pb.alert as Control).visible = warn
	if sel == null:
		status_lbl.text = "Tap a portrait"
		return
	var act: String = "Walking" if sel.mode == "walk" else (sel.activity if sel.activity != "" else "Idle")
	status_lbl.text = "%s · %s" % [sel.name, act]
	if not open:
		return
	pname.text = sel.name
	prole.text = "%s · age %d" % [sel.role, sel.age]
	pact.text = act
	if tab == "needs":
		var fi := _face_for(sel.mood)
		if fi != _last_face:
			_last_face = fi
			mood_icon.texture = _icon_tex("gi:face%d" % fi)
		mood_text.text = "Mood: [b][color=#f0cd76]%s[/color][/b]" % Life.mood_label(sel.mood)
		mood_bar.frac = sel.mood
		mood_bar.queue_redraw()
		for n in GameData.needs:
			var v: float = sel.needs[n]
			var vial: Vial = vials[n]
			vial.frac = v
			vial.state = 2 if v < 0.25 else (1 if v < 0.5 else 0)
			vial.set_process(vial.state == 2)
			vial.queue_redraw()
	else:
		var sig := _signature(tab, sel)
		if sig != _last_sig:
			_last_sig = sig
			var keep := pbody.scroll_vertical
			_render_tab(tab, sel)
			await get_tree().process_frame
			pbody.scroll_vertical = keep


# a cheap fingerprint of whatever a tab shows, so we only rebuild its controls when something changed
func _signature(id: String, c: Dictionary) -> String:
	match id:
		"bonds":
			var parts: Array = [c.id]
			for oid in c.rel:
				var o: Dictionary = sim.get_char(oid)
				var near: bool = (o.x - c.x) * (o.x - c.x) + (o.z - c.z) * (o.z - c.z) < 6.25
				parts.append([oid, roundi(c.rel[oid].aff), near])
			return JSON.stringify(parts)
		"wishes":
			var p2: Array = [c.id]
			for w in c.wishes:
				p2.append([w.text, w.done])
			for g in c.goals:
				p2.append([g.state])
				for st in g.steps:
					var pr := Life.step_progress(c, sim, st)
					p2.append([st.done, pr.cur])
			return JSON.stringify(p2)
		"skills":
			var p3: Array = [c.id]
			for k in c.skills:
				p3.append([k, c.skills[k].level, roundi(c.skills[k].xp / (40.0 * (c.skills[k].level + 1)) * 50.0)])
			return JSON.stringify(p3)
		"work":
			return JSON.stringify([c.id, sim.hour >= (c.job.hours[0] if c.job.hours != null else 0) and sim.hour < (c.job.hours[1] if c.job.hours != null else 0)])
		"past":
			return JSON.stringify([c.id, c.history.size()])
		_:
			return id + str(c.id)


func _clear(n: Node) -> void:
	for ch in n.get_children():
		n.remove_child(ch)
		ch.queue_free()


func _render_tab(id: String, c: Dictionary) -> void:
	_clear(pane_dyn)
	match id:
		"bonds": _tab_bonds(c)
		"wishes": _tab_wishes(c)
		"likes": _tab_likes(c)
		"skills": _tab_skills(c)
		"work": _tab_work(c)
		"past": _tab_past(c)


func _add(c: Control, gap: float = 8.0) -> void:
	pane_dyn.add_child(c)
	var sp := Control.new()
	sp.custom_minimum_size = Vector2(0, gap * S)
	sp.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pane_dyn.add_child(sp)


func _hint(t: String) -> void:
	_add(_wrap(t, 12, Color("a99872")), 4)


func _chip(icon: String, text: String, kind: String = "") -> Control:
	var p := PanelContainer.new()
	var border := Color("8a6a32")
	var bg := Color(0, 0, 0, 0.3)
	if kind == "good":
		border = Color("6aae6a"); bg = Color(0.35, 0.63, 0.35, 0.15)
	elif kind == "bad":
		border = Color("c0605a"); bg = Color(0.75, 0.31, 0.27, 0.15)
	p.add_theme_stylebox_override("panel", _flat(bg, border, 1.5, 999.0, 5.0))
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var h := _hbox(5)
	h.add_child(_ico(icon, 15))
	h.add_child(_lbl(text, 13, Color("f0e4c4")))
	p.add_child(h)
	return p


func _flow(children: Array) -> Control:
	var f := HFlowContainer.new()
	f.add_theme_constant_override("h_separation", int(6 * S))
	f.add_theme_constant_override("v_separation", int(6 * S))
	f.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for ch in children:
		f.add_child(ch)
	return f


func _tab_bonds(c: Dictionary) -> void:
	_add(_h4("Family & Friends"), 6)
	for oid in c.rel:
		var r: Dictionary = c.rel[oid]
		var o: Dictionary = sim.get_char(oid)
		var card := _card()
		var row := _hbox(10)
		card.add_child(row)
		row.add_child(_circle_avatar(oid, 46.0, Color("5b4426"), 2.0))
		var col := _vbox(2)
		col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(col)
		var rt := _hbox(8)
		rt.add_child(_lbl(o.name, 14, Color("f6ead0")))
		rt.add_child(_lbl(r.label, 12, DIM))
		rt.add_child(_spacer())
		var near: bool = (o.x - c.x) * (o.x - c.x) + (o.z - c.z) * (o.z - c.z) < 6.25
		if near:
			rt.add_child(_lbl("nearby", 12, GOOD))
		col.add_child(rt)
		var aff := roundi(r.aff)
		col.add_child(_bar((r.aff + 100.0) / 200.0, Color("a83a32") if aff < 0 else Color("c95a68")))
		var rs := _hbox(4)
		rs.add_child(_lbl(Life.bond_label(r.aff), 12, TEXT))
		rs.add_child(_spacer())
		rs.add_child(_lbl("%s%d" % ["+" if aff > 0 else "", aff], 12, DIM))
		col.add_child(rs)
		col.add_child(_wrap(r.note))
		_add(card, 8)
	_hint("Time spent together, shared meals and company strengthen bonds. Clashing tastes can strain them.")


func _tab_wishes(c: Dictionary) -> void:
	_add(_h4("Wishes", "for now"), 6)
	for w in c.wishes:
		var row := _hbox(8)
		var ck := Check.new()
		ck.done = w.done
		ck.custom_minimum_size = Vector2(18 * S, 18 * S)
		ck.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(ck)
		row.add_child(_wrap(w.text, 13.5, GOOD if w.done else TEXT))
		_add(row, 4)
	_add(_h4("Life goals"), 6)
	for g in c.goals:
		var card := _card(GOLDHI if g.state == "done" else Color(0.79, 0.64, 0.30, 0.4))
		var v := _vbox(3)
		card.add_child(v)
		var title := _hbox(6)
		title.add_child(_ico("🏆" if g.state == "done" else "🎯", 17))
		title.add_child(_lbl(g.title, 14, Color("f6ead0")))
		v.add_child(title)
		v.add_child(_wrap(g.desc))
		var done := 0
		for st in g.steps:
			if st.done:
				done += 1
		v.add_child(_bar(float(done) / g.steps.size(), Color("d9b05a")))
		for st in g.steps:
			var p := Life.step_progress(c, sim, st)
			var line := _hbox(8)
			var ck2 := Check.new()
			ck2.done = st.done
			ck2.custom_minimum_size = Vector2(16 * S, 16 * S)
			ck2.mouse_filter = Control.MOUSE_FILTER_IGNORE
			line.add_child(ck2)
			var txt: String = st.text
			if not st.done and not p.has("flag") and p.max > 1:
				txt += "  (%d/%d)" % [p.cur, p.max]
			if not st.done and st.check.has("flag"):
				txt += "  · awaits fate"
			line.add_child(_wrap(txt, 13, GOOD if st.done else TEXT))
			v.add_child(line)
		_add(card, 8)
	if c.dream != null:
		var dc := _card(Color(0.79, 0.64, 0.30, 0.6))
		var dv := _vbox(2)
		dc.add_child(dv)
		var dh := _hbox(6)
		dh.add_child(_ico("✨", 16))
		dh.add_child(_lbl("A dream yet to wake", 13.5, Color("f6ead0")))
		dv.add_child(dh)
		dv.add_child(_wrap(c.dream, 12.5, Color("d6c59c")))
		_add(dc, 4)


func _tab_likes(c: Dictionary) -> void:
	_add(_h4("Likes"), 6)
	var good: Array = []
	for t in c.likes:
		good.append(_chip(GameData.tags[t].icon, GameData.tags[t].label, "good"))
	_add(_flow(good) if not good.is_empty() else _lbl("Nothing in particular", 12, DIM), 8)
	_add(_h4("Dislikes"), 6)
	var bad: Array = []
	for t in c.dislikes:
		bad.append(_chip(GameData.tags[t].icon, GameData.tags[t].label, "bad"))
	_add(_flow(bad) if not bad.is_empty() else _lbl("Nothing in particular", 12, DIM), 8)
	_hint("Doing something they like lifts %s’s mood and keeps them coming back to it. Doing something they dislike sours it, and nearby people may take offence." % c.name)


func _tab_skills(c: Dictionary) -> void:
	_add(_h4("Traits"), 6)
	for t in c.traits:
		var tr: Dictionary = GameData.traits[t]
		var row := _hbox(10)
		row.add_child(_ico(tr.icon, 22))
		var v := _vbox(1)
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_child(_lbl(tr.name, 14, Color("f6ead0")))
		v.add_child(_wrap(tr.desc))
		row.add_child(v)
		_add(row, 8)
	_add(_h4("Abilities"), 6)
	var untrained: Array = []
	for k in c.skills:
		var s: Dictionary = c.skills[k]
		var sk: Dictionary = GameData.skills[k]
		if s.level > 0 or s.xp > 0:
			var row := _hbox(10)
			row.add_child(_ico(sk.icon, 22))
			var v := _vbox(2)
			v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			var rt := _hbox(8)
			rt.add_child(_lbl(sk.name, 14, Color("f6ead0")))
			rt.add_child(_spacer())
			rt.add_child(_lbl("Lv %d" % s.level, 12, DIM))
			v.add_child(rt)
			var pips := Pips.new()
			pips.level = s.level
			pips.custom_minimum_size = Vector2(0, 8 * S)
			pips.mouse_filter = Control.MOUSE_FILTER_IGNORE
			v.add_child(pips)
			v.add_child(_bar(s.xp / (40.0 * (s.level + 1)), Color("5f8fb0")))
			row.add_child(v)
			_add(row, 8)
		else:
			untrained.append(sk.name)
	if not untrained.is_empty():
		_hint("Untrained: " + " · ".join(untrained))


func _kv(k: String, v: String) -> Control:
	var h := _hbox(4)
	h.add_child(_lbl(k, 13, NOTE))
	h.add_child(_spacer())
	h.add_child(_lbl(v, 13, Color("f6ead0")))
	return h


func _tab_work(c: Dictionary) -> void:
	var j: Dictionary = c.job
	if j.place == null:
		_add(_h4("Occupation"), 6)
		var card := _card()
		var v := _vbox(2)
		card.add_child(v)
		v.add_child(_lbl(j.title, 14, Color("f6ead0")))
		v.add_child(_wrap(j.note))
		_add(card, 8)
		_add(_h4("Possible paths"), 6)
		var chips: Array = []
		for f in j.get("future", []):
			chips.append(_chip("🧭", f))
		_add(_flow(chips), 6)
		_hint("Paths open up through choices, skills and chance meetings.")
		return
	var on: bool = sim.hour >= float(j.hours[0]) and sim.hour < float(j.hours[1])
	_add(_h4("Occupation"), 6)
	var card2 := _card()
	var v2 := _vbox(3)
	card2.add_child(v2)
	var rt := _hbox(8)
	rt.add_child(_lbl(j.title, 14, Color("f6ead0")))
	rt.add_child(_spacer())
	rt.add_child(_lbl("Work hours" if on else "Off duty", 12, GOOD if on else DIM))
	v2.add_child(rt)
	v2.add_child(_kv("Workplace", j.place))
	v2.add_child(_kv("Hours", "%02d:00 – %02d:00" % [int(j.hours[0]), int(j.hours[1])]))
	v2.add_child(_kv("Wage", "%d coins / day" % int(j.wage)))
	var chips2: Array = []
	for k in j.skills:
		chips2.append(_chip(GameData.skills[k].icon, GameData.skills[k].name))
	v2.add_child(_flow(chips2))
	v2.add_child(_wrap(j.note))
	_add(card2, 8)
	_hint("Working days and wages arrive with the economy update.")


func _tab_past(c: Dictionary) -> void:
	var bio := _card()
	bio.add_child(_wrap(c.bio, 13.5, Color("f0e4c4")))
	_add(bio, 8)
	_add(_h4("Life story"), 6)
	var hist: Array = c.history.duplicate()
	hist.reverse()
	for h in hist:
		var row := _hbox(10)
		var badge := PanelContainer.new()
		badge.add_theme_stylebox_override("panel", _flat(WOOD2, Color("8a6a32"), 2.0, 14.0, 4.0))
		badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
		badge.add_child(_ico(h.icon, 16))
		badge.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
		row.add_child(badge)
		var v := _vbox(0)
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_child(_lbl(h.date, 11.5, DIM))
		v.add_child(_wrap(h.text, 13, Color("f0e4c4")))
		row.add_child(v)
		_add(row, 6)


func set_hour_silently(h: float) -> void:
	time_slider.set_value_no_signal(h)


## Reflect saved options in the switch without re-emitting.
func set_pixel_ui(enabled: bool, cell: int) -> void:
	_px_cell = cell
	_px_sw.set_pressed_no_signal(enabled)


## Height (viewport px) of what the dock currently occupies at the bottom of the screen.
func dock_height() -> float:
	return dock_box.get_combined_minimum_size().y
