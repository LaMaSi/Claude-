class_name FaceBaker
extends Node
## Paints face textures once through a SubViewport and swaps the result into the face material as a mipmapped
## ImageTexture. (Mipmaps matter: heads are tiny on screen and an unfiltered texture would shimmer.)
## Until a texture is ready the material shows the flat skin colour.

var _queue: Array = []
var _busy := false


func request(L: Dictionary, mat: StandardMaterial3D) -> void:
	_queue.append({"L": L, "mat": mat})
	if not _busy:
		_run()


func pending() -> int:
	return _queue.size() + (1 if _busy else 0)


func _run() -> void:
	_busy = true
	while not _queue.is_empty():
		# bake several faces per frame: each gets its own tiny viewport, all rendered in the same pass
		var batch: Array = []
		while not _queue.is_empty() and batch.size() < 8:
			batch.append(_queue.pop_front())
		var vps: Array = []
		for job in batch:
			var vp := SubViewport.new()
			vp.size = Vector2i(Face.TEX_W, Face.TEX_H)
			vp.transparent_bg = false
			vp.msaa_2d = Viewport.MSAA_4X
			vp.render_target_update_mode = SubViewport.UPDATE_ONCE
			var fp := FacePaint.new()
			fp.L = job.L
			fp.W = Face.TEX_W
			fp.H = Face.TEX_H
			vp.add_child(fp)
			add_child(vp)
			vps.append(vp)
		await RenderingServer.frame_post_draw
		await RenderingServer.frame_post_draw
		for i in batch.size():
			var img := (vps[i] as SubViewport).get_texture().get_image()
			if img != null and not img.is_empty():
				img.convert(Image.FORMAT_RGB8)
				img.generate_mipmaps()
				(batch[i].mat as StandardMaterial3D).albedo_texture = ImageTexture.create_from_image(img)
				(batch[i].mat as StandardMaterial3D).albedo_color = Color.WHITE
			(vps[i] as SubViewport).queue_free()
	_busy = false
