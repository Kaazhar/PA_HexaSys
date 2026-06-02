package services

import (
	"strings"
	"unicode"
)

var motsInterdits = []string{
	"merde", "merdique", "emmerde", "emmerdeur", "putain", "pute", "putes",
	"connard", "connards", "connasse", "conne", "con", "cons", "abruti", "abrutie",
	"salope", "salopard", "salaud", "ordure", "raclure", "fumier", "pourriture",
	"enculé", "encule", "enculer", "enculs", "enculés", "encule de ta race",
	"pétasse", "petasse", "pouffiasse", "poufiasse", "grognasse", "morue", "traînée", "trainee",
	"batard", "bâtard", "batards", "bâtards", "fdp", "fils de pute", "fils de putes",
	"ntm", "nique", "niquer", "nique ta mère", "nique ta mere", "nique ta race",
	"tg", "ta gueule", "ferme ta gueule", "gueule", "trou du cul", "trouduc",
	"branleur", "branleuse", "branler", "couilles", "couille", "bite", "bites",
	"chatte", "teub", "zboub", "zgeg", "burne", "burnes", "cul", "foutre",
	"débile", "debile", "crétin", "cretin", "crétine", "imbécile", "imbecile",
	"idiot", "idiote", "andouille", "abrutis", "demeuré", "demeure", "attardé", "attarde",
	"taré", "tare", "tarée", "malade mental", "gros porc", "porc", "grosse vache",
	"pédé", "pede", "pédale", "pedale", "tapette", "tarlouze", "gouine", "enfoiré", "enfoire",
	"negro", "nègre", "negre", "bougnoule", "bicot", "bamboula", "youpin", "feuj",
	"bouffon", "bouffonne", "clochard", "clodo", "cassos", "bolosse", "boloss", "naze",
	"sale arabe", "sale juif", "sale noir", "sale race", "sale chien", "sale pute",
	"va te faire foutre", "va te faire enculer", "casse toi", "ferme la",
	"arnaque", "arnaqueur", "arnaqueuse", "escroc", "escroquerie", "escroquer",
	"spam", "scam", "scammer", "phishing", "contrefaçon", "contrefacon", "faux billets",
	"drogue", "cannabis", "cocaïne", "cocaine", "héroïne", "heroine", "ecstasy",
}

// Vérifie si l'un des textes contient un mot interdit (insensible à la casse, mot entier).
// Renvoie true + le mot trouvé, sinon false.
func ContientMotInterdit(textes ...string) (bool, string) {
	for _, texte := range textes {
		tokens := strings.FieldsFunc(strings.ToLower(texte), func(r rune) bool {
			return !unicode.IsLetter(r) && !unicode.IsNumber(r)
		})
		joined := " " + strings.Join(tokens, " ") + " "

		for _, mot := range motsInterdits {
			motBas := strings.ToLower(mot)
			if strings.Contains(motBas, " ") {
				if strings.Contains(joined, " "+motBas+" ") {
					return true, mot
				}
				continue
			}
			for _, token := range tokens {
				if token == motBas {
					return true, mot
				}
			}
		}
	}
	return false, ""
}
