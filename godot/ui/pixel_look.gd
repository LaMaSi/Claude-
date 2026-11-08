class_name PixelLook
extends ColorRect
## Optional "pixel art" look: the finished frame is snapped to a coarse grid, posterised and lightly dithered.
## (The three.js build also draws a depth outline; canvas shaders cannot read the depth buffer, so that part is omitted.)

const SHADER := """
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest, repeat_disable;
uniform float cell = 3.0;
uniform float levels = 24.0;
void fragment() {
	vec2 res = 1.0 / SCREEN_PIXEL_SIZE;
	vec2 p = floor(FRAGCOORD.xy / cell);
	vec2 uv = (p + 0.5) * cell / res;
	vec3 col = texture(screen_tex, uv).rgb;
	float b = (mod(p.x, 2.0) + 2.0 * mod(p.y, 2.0) + 0.5) / 4.0 - 0.5;   // 2x2 ordered dither
	col = floor(col * levels + b * 0.3 + 0.5) / levels;
	COLOR = vec4(col, 1.0);
}
"""

var _mat := ShaderMaterial.new()


func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := Shader.new()
	sh.code = SHADER
	_mat.shader = sh
	material = _mat
	visible = false


func set_cell(px: float) -> void:
	_mat.set_shader_parameter("cell", px)
