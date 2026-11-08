extends SceneTree
## Headless smoke test of the ported simulation: godot --headless --path godot -s tests/sim_test.gd

func _init() -> void:
	GameData.ensure()
	seed(42)
	var sim := Sim.new(GameData.house, GameData.family)
	print("nav grid %dx%d, blocked cells: %d" % [sim.nav.nx, sim.nav.nz, sim.nav.blocked.count(1)])
	var off_grid := 0
	var modes := {}
	var uses := {}
	var t_total := 600.0  # ten simulated minutes at 30 fps
	var dt := 1.0 / 30.0
	var steps := int(t_total / dt)
	var t0 := Time.get_ticks_msec()
	for i in steps:
		sim.hour = fmod(21.5 + i * dt / 120.0, 24.0)
		sim.update(dt)
		for c in sim.chars:
			modes[c.mode] = int(modes.get(c.mode, 0)) + 1
			if c.mode == "use":
				uses[c.activity] = int(uses.get(c.activity, 0)) + 1
			if c.mode == "walk" and not sim.nav.walkable(c.x, c.z):
				off_grid += 1
	print("sim time %.0fs ran in %d ms" % [t_total, Time.get_ticks_msec() - t0])
	print("mode frames: ", modes, "  walking-on-blocked-cell frames: ", off_grid)
	print("activities used: ", uses)
	for c in sim.chars:
		var needs := []
		for n in GameData.needs:
			needs.append("%s %.2f" % [n, c.needs[n]])
		print("%s mood %.2f (%s) | %s" % [c.name, c.mood, Life.mood_label(c.mood), ", ".join(needs)])
		print("   wishes: ", c.wishes.map(func(w): return w.text + (" ✓" if w.done else "")))
		print("   tags: ", c.stats.tags, " skills>0: ", c.skills.keys().filter(func(k): return c.skills[k].level > 0 or c.skills[k].xp > 0))
		var log_lines: Array = c.history.filter(func(h): return h.get("live", false))
		for h in log_lines:
			print("   log: %s %s" % [h.icon, h.text])
	# path sanity: door-to-garden path and a blocked-target snap
	var p: Variant = sim.nav.find_path(Vector2(0, 0), Vector2(-6.5, 4.5))
	print("path door->garden: ", p)
	var snapped: Variant = sim.nav.nearest_walkable(2.15, -2.58)
	print("hearth tile snaps to: ", snapped)
	quit(0)
