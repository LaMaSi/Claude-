class_name GameData
extends RefCounted
## Loads the JSON exported from src/data (see tools/export_data.mjs). Everything is plain data.

static var loaded := false
static var furniture: Dictionary
static var needs: Array
static var grid: Dictionary
static var house: Dictionary
static var family: Array
static var start_date: Dictionary
static var traits: Dictionary
static var skills: Dictionary
static var wishes: Array
static var tags: Dictionary
static var variants: Array


static func _read(file: String) -> Variant:
	var f := FileAccess.open("res://data/%s.json" % file, FileAccess.READ)
	assert(f != null, "missing data file %s" % file)
	return JSON.parse_string(f.get_as_text())


static func ensure() -> void:
	if loaded:
		return
	var fam: Dictionary = _read("family")
	family = fam.FAMILY
	start_date = fam.START_DATE
	var fur: Dictionary = _read("furniture")
	furniture = fur.FURNITURE
	needs = fur.NEEDS
	house = _read("house")
	var tr: Dictionary = _read("traits")
	traits = tr.TRAITS
	skills = tr.SKILLS
	wishes = tr.WISHES
	tags = tr.TAGS
	variants = _read("variants")
	grid = {"cell": 1.0, "snap": 0.25}
	loaded = true


## 0xRRGGBB (as exported from JS) -> Color. Color.hex() expects RRGGBBAA, so build it by hand.
static func col(h: Variant) -> Color:
	var v := int(h)
	return Color8((v >> 16) & 255, (v >> 8) & 255, v & 255)
