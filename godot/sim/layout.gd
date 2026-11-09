class_name Layout
extends RefCounted
## Saves and loads the player's furniture layout (user://house_layout.json). A missing or unreadable file means
## "use the default house", so a bad save can never stop the game from starting.

const PATH := "user://house_layout.json"


static func save(items: Array, path: String = PATH) -> bool:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify({"version": 1, "items": items}))
	return true


## Returns an Array of items, or null if there is no valid saved layout.
static func load_items(path: String = PATH) -> Variant:
	if not FileAccess.file_exists(path):
		return null
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not (data is Dictionary) or not data.has("items") or not (data.items is Array):
		return null
	var out: Array = []
	for it in data.items:
		if it is Dictionary and GameData.furniture.has(it.get("def", "")) and it.has("x") and it.has("z"):
			out.append({"def": it.def, "x": float(it.x), "z": float(it.z), "rot": float(it.get("rot", 0.0)),
				"y": float(it.y) if it.has("y") else 0.0})
			if not it.has("y"):
				out[out.size() - 1].erase("y")
	return out if not out.is_empty() else null


static func clear(path: String = PATH) -> void:
	if FileAccess.file_exists(path):
		DirAccess.remove_absolute(path)
