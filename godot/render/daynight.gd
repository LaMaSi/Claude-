class_name DayNight
extends Node
## Night-first lighting: moonlit blue-green nights with warm candle/hearth/lantern pools are the "hero" look.
## Daytime exists but is deliberately dim and moody (overcast, golden). Ported from src/render/daynight.js.
##
## Lighting model: ONE directional light (sun by day, moon by night) with shadows, a uniform tinted ambient (stands in
## for the three.js HemisphereLight), and warm point lights for hearth, candles, lanterns. Two directional lights and a
## sky-sourced ambient were avoided on purpose: both misrendered on the software Vulkan used for verification here.

const HAZE := [
	[0.0, 0x0c1520], [5.0, 0x131f2b], [6.5, 0x4a4450], [8.0, 0x56706c], [12.0, 0x628274],
	[17.0, 0x56706c], [19.0, 0x543e48], [20.5, 0x172030], [24.0, 0x0c1520]]
const SUN := [
	[0.0, 0x7f95d8], [5.5, 0x7f95d8], [7.0, 0xffb070], [9.0, 0xffe9c4], [15.0, 0xffe9c4], [18.0, 0xff9a60],
	[19.5, 0x8aa0d8], [24.0, 0x7f95d8]]

# three.js lights are physically scaled (diffuse = albedo/PI); Godot's are not, hence the 1/PI everywhere.
const K_FIRE := 0.16
const K_LAMP := 0.17
# one global calibration knob against the web build's tone mapping (see tools/compare notes in the PR)
const GAIN_DAY := 3.5
const GAIN_NIGHT := 3.0

var env: Environment
var sun: DirectionalLight3D
var world_env: WorldEnvironment


static func sample(table: Array, h: float) -> Color:
	for i in table.size() - 1:
		var a: float = table[i][0]; var b: float = table[i + 1][0]
		if h >= a and h <= b:
			return GameData.col(table[i][1]).lerp(GameData.col(table[i + 1][1]), (h - a) / (b - a))
	return GameData.col(table[0][1])


func _ready() -> void:
	env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.fog_enabled = not OS.has_environment("LL_NOFOG")
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_depth_begin = 44.0
	env.fog_depth_end = 92.0
	env.fog_depth_curve = 1.0
	env.fog_density = 1.0
	world_env = WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	sun = DirectionalLight3D.new()
	sun.shadow_enabled = not OS.has_environment("LL_NOSHADOW")
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 70.0
	sun.shadow_bias = 0.04
	sun.shadow_normal_bias = 1.2
	sun.shadow_blur = 1.6
	add_child(sun)


## Returns the "night amount" (0 = day, 1 = night). `world` supplies the registered lights and glow pieces.
func update(hour: float, world: World, time: float) -> float:
	var haze := sample(HAZE, hour)
	env.background_color = haze
	env.fog_light_color = haze
	var day := hour > 6.0 and hour < 19.5
	var t: float
	if day:
		t = (hour - 6.0) / 13.5
	else:
		t = ((hour + (24.0 if hour < 6.0 else 0.0)) - 19.5) / 10.5
	var ang := t * PI
	var sun_pos := Vector3(-cos(ang) * 22.0, sin(ang) * 20.0 + 4.0, 10.0 + (0.0 if day else -4.0))
	sun.look_at_from_position(sun_pos, Vector3.ZERO, Vector3.UP)
	sun.light_color = sample(SUN, hour)
	var day_amt := smoothstep(0.0, 0.35, sin(ang))
	var k := day_amt if day else 0.0
	var gain := lerpf(GAIN_NIGHT, GAIN_DAY, k)
	sun.light_energy = (lerpf(0.7, 1.45, day_amt) if day else 0.75) / PI * gain
	# hemisphere light stand-in
	var sky := Color(0x6f / 255.0, 0x86 / 255.0, 0xc0 / 255.0).lerp(Color(0xe6 / 255.0, 0xec / 255.0, 0xf0 / 255.0), k)
	var gnd := Color(0x1c / 255.0, 0x2a / 255.0, 0x24 / 255.0).lerp(Color(0x56 / 255.0, 0x60 / 255.0, 0x4a / 255.0), k)
	env.ambient_light_color = sky.lerp(gnd, 0.35)
	env.ambient_light_energy = lerpf(0.55, 0.62, k) / PI * gain
	env.tonemap_exposure = lerpf(1.0, 0.82, k)
	var night := 1.0 - k
	var r: Dictionary = world.reg
	for l in r.lamp_lights:
		l.light_energy = night * 11.0 * K_LAMP
		l.visible = night > 0.02   # an unlit omni still costs per-pixel work on the Mobile renderer
	for s in r.lamp_shades:
		(s.material_override as StandardMaterial3D).emission_energy_multiplier = night * 1.5
	for g in r.window_glass:
		var m: StandardMaterial3D = g.material_override
		m.albedo_color.a = 0.3 + night * 0.25
		m.emission_energy_multiplier = night * 0.95
	var fl := 0.88 + 0.12 * sin(time * 13.0) * sin(time * 7.3) + 0.05 * sin(time * 31.0)
	for l in r.fire_lights:
		l.light_energy = (1.6 + night * 7.5) * fl * K_FIRE
	for f in r.flames:
		f.scale = Vector3(1, 0.85 + 0.3 * fl, 1)
		(f.material_override as StandardMaterial3D).emission_energy_multiplier = 1.2 + 0.8 * fl
	world.update_fireflies(time, night)
	return night
