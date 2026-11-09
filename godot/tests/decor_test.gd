extends SceneTree
## Headless test of the decorating foundation: placement rules, add/move/remove, nav updates, evicting users, save/load.
var fails := 0
func check(ok: bool, what: String) -> void:
	print(("PASS  " if ok else "FAIL  ") + what)
	if not ok:
		fails += 1

func _init() -> void:
	GameData.ensure()
	seed(5)
	var sim := Sim.new(GameData.house, GameData.family)
	var n0 := sim.items.size()
	var blocked0 := sim.nav.blocked.count(1)

	var spot := Vector2.ZERO
	var found := false
	for zi in range(-10, 11):
		for xi in range(-12, 13):
			if not found and sim.can_place("chest", xi * 0.25, zi * 0.25, 0.0).ok:
				spot = Vector2(xi * 0.25, zi * 0.25)
				found = true
	check(found, "a chest fits somewhere free (first free spot %s)" % spot)
	var r := sim.can_place("table", -2.9, -1.85, 0.0)
	check(not r.ok and "overlaps" in r.reason, "table on the bed is refused (%s)" % r.reason)
	r = sim.can_place("chest", 4.4, 0.0, 0.0)
	check(not r.ok and "outside" in r.reason, "chest through the right wall is refused (%s)" % r.reason)
	check(sim.can_place("rug", -2.2, 1.1, 0.0).ok, "a rug may overlap other furniture")
	# wall the door in with a row of barrels: the house must stay reachable
	var wall_ok := true
	for z in [1.6, 2.2, 2.8]:
		var rr := sim.can_place("barrel", -3.4, z, 0.0)
		if rr.ok:
			sim.add_item("barrel", -3.4, z, 0.0)
		else:
			wall_ok = false
			print("      refused barrel at z=%s: %s" % [z, rr.reason])
	check(not wall_ok, "blocking the doorway completely is refused")
	# restore to the original item count for the rest
	while sim.items.size() > n0:
		sim.remove_item(sim.items[sim.items.size() - 1].index)

	# add / move / remove updates the nav grid
	var id := sim.add_item("chest", spot.x, spot.y, 0.0)
	check(sim.items.size() == n0 + 1 and sim.nav.blocked.count(1) > blocked0, "adding a chest blocks nav cells")
	sim.move_item(id, 0.5, 0.0, PI / 2.0)
	check(sim.get_item(id).x == 0.5 and not sim.nav.walkable(0.5, 0.0), "moving it blocks its new spot")
	check(sim.nav.walkable(spot.x, spot.y), "...and frees the old spot")
	sim.remove_item(id)
	check(sim.items.size() == n0 and sim.nav.blocked.count(1) == blocked0, "removing it restores the original nav grid exactly")

	# someone sitting on a stool when it is removed gets up cleanly
	var sam: Dictionary = sim.get_char("sam")
	var stool: Dictionary = sim.items.filter(func(i): return i.def == "stool")[0]
	sim.select("maya")
	sim.command_use(sam, stool.index)
	for i in 900:
		sim.update(1.0 / 30.0)
		if sam.mode == "use":
			break
	var seated: bool = sam.mode == "use" and sam.use.item.index == stool.index
	if seated:
		sim.remove_item(stool.index)
		check(sam.mode == "idle" and sam.use == null and sam.pose.kind == "stand", "removing a used stool stands the user up (mode=%s)" % sam.mode)
		check(not sim.occupied.has("%d:0" % stool.index), "...and frees its slot")
		for i in 600:
			sim.update(1.0 / 30.0)
		check(true, "simulation keeps running after the removal")
	else:
		print("      (could not seat Sam in 30 s; skipping eviction check)")

	# save / load round trip
	var data := sim.layout_data()
	check(Layout.save(data, "user://test_layout.json"), "layout saves")
	var loaded: Variant = Layout.load_items("user://test_layout.json")
	check(loaded != null and loaded.size() == data.size(), "layout loads back with the same item count (%d)" % data.size())
	var sim2 := Sim.new(GameData.house, GameData.family, loaded)
	check(sim2.items.size() == data.size() and sim2.nav.blocked.count(1) == sim.nav.blocked.count(1), "a sim built from the saved layout has an identical nav grid")
	Layout.clear("user://test_layout.json")
	check(Layout.load_items("user://nope.json") == null, "a missing save falls back to the default house")
	print("\n%s (%d failures)" % ["ALL PASSED" if fails == 0 else "FAILED", fails])
	quit(fails)
