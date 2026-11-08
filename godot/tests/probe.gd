extends SceneTree
func _init() -> void:
	var t0 := Time.get_ticks_msec()
	GameData.ensure()
	print("data ok ", Time.get_ticks_msec() - t0)
	var nav := NavGrid.build(GameData.house, GameData.furniture)
	print("nav ", nav.nx, "x", nav.nz, " blocked ", nav.blocked.count(1), " ", Time.get_ticks_msec() - t0)
	var p: Variant = nav.find_path(Vector2(0, 0), Vector2(-6.5, 4.5))
	print("path ", p, " ", Time.get_ticks_msec() - t0)
	var sim := Sim.new(GameData.house, GameData.family)
	print("sim created ", Time.get_ticks_msec() - t0)
	for i in 300:
		sim.update(1.0 / 30.0)
	print("300 updates ", Time.get_ticks_msec() - t0)
	quit(0)
