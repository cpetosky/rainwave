var SongsTable = function(songs, columns) {
	"use strict";
	var el = $el("table", { "class": "songlist" });

	var row, cell;
	for (var i = 0; i < songs.length; i++) {
		row = $el("tr");
		if (("cool" in songs[i]) && songs[i].cool) {
			row.className = "songlist_cool";
		}

		var requestable = false;
		if (("origin_sid" in songs[i]) && (songs[i].origin_sid == User.sid)) requestable = true;
		if (("sid" in songs[i]) && (songs[i].sid == User.sid)) requestable = true;
		if (("requestable" in songs[i]) && (songs[i].requestable)) requestable = true;

		if (requestable) {
			row.appendChild($el("td"), { "class": "songlist_requestable", "textContent": $l("Request") });
			// TODO: make requestable
		}
		else {
			row.appendChild($el("td"), { "class": "songlist_not_requestable" });
		}

		if (songs[i].url) {
			row.appendChild($el("td", { "class": "songlist_" + columns[key] }, songlist_Formatting.linkify_external($el("a", { "target": "_blank", "href": songs[i].url, "textContent": "" }))));
		}

		for (var key = 0; key < columns.length; key++) {
			if ((columns[key] == "artists") && ("artist_parseable" in songs[i])) {
				Artists.append_spans_from_string(row.appendChild($el("td", { "class": "songlist_" + columns[key] })), songs[i].artist_parseable);
			}
			else if (columns[key] in songs[i]) {
				if (columns[key] == "rating") {
					cell = $el("td", { "class": "songlist_" + columns[key] });
					cell.appendChild(Rating("song", songs[i].id, songs[i].rating_user, songs[i].rating, songs[i].fave, User.radio_rate_anything).el);
					row.appendChild(cell);
				}
				else if (columns[key] == "song_cool_end" && (songs[i].song_cool_end > Clock.now)) {
					row.appendChild($el("td", { "class": "songlist_" + columns[key], "textContent": Formatting.cooldown_glance(songs[i].song_cool_end - Clock.now) } ));
				}
				else if (columns[key] == "length") {
					row.appendChild($el("td", { "class": "songlist_" + columns[key], "textContent": Formatting.minute_clock(songs[i].length) }));
				}
				else {
					row.appendChild($el("td", { "class": "songlist_" + columns[key], "textContent": songs[i][columns[key]] } ));
				}
			}
		}

		el.appendChild(row);
	}

	return el;
};