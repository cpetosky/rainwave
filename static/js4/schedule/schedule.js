var Schedule = function() {
	"use strict";
	var self = {};
	self.events = [];
	self.el = null;

	var first_time = true;
	var sched_next;
	var sched_current;
	var current_event;

	var timeline_scrollbar;
	var timeline_resizer;

	var now_playing_size = 0;

	self.now_playing_size_calculate = function() {
		now_playing_size = current_event.el.offsetHeight;
	};

	self.scroll_init = function() {
		self.el = $id("timeline");
		timeline_scrollbar = Scrollbar.new(self.el, $id("timeline_scrollbar"), 30);
		timeline_scrollbar.pending_self_update = true;
		timeline_resizer = Scrollbar.new_resizer($id("timeline_scrollblock"), self.el, $id("timeline_resizer"));
		timeline_resizer.callback = DetailView.on_resize;
	};

	self.stage_padding_check = function() {
		if ($has_class(document.body, "stage_3")) {
			self.el.style.paddingRight = Scrollbar.get_scrollbar_width() + 15 + "px";
		}
		else {
			self.el.style.paddingRight = "";
		}
	};

	self.initialize = function() {
		API.add_callback(function(json) { sched_current = json; }, "sched_current");
		API.add_callback(function(json) { sched_next = json; }, "sched_next");
		API.add_callback(self.update, "_SYNC_COMPLETE");

		API.add_callback(self.register_vote, "vote_result");
		API.add_callback(self.tune_in_voting_allowed_check, "user");
	};

	self.update = function() {
		var new_events = [];
		var i;

		// Mark everything for deletion - this flag will get updated to false as events do
		for (i = 0; i < self.events.length; i++) {
			self.events[i].pending_delete = true;
		}

		current_event = find_and_update_event(sched_current);
		current_event.change_to_now_playing();
		if (first_time) {
			current_event.el.style.marginTop = SCREEN_HEIGHT + "px";
		}
		Fx.delay_css_setting(current_event.el, "marginTop", "10px");
		timeline_scrollbar.pending_self_update = true;
		Fx.chain_transition(current_event.el, function(e) {
			setTimeout(function() { self.scrollbar_recalculate(); }, 1100);
		});
		new_events.push(current_event);
		if (!current_event.el.parentNode) self.el.appendChild(current_event.el);

		var temp_evt, previous_evt, sequenced_margin;
		for (i = 0; i < sched_next.length; i++) {
			temp_evt = find_and_update_event(sched_next[i]);
			temp_evt.change_to_coming_up();
			if (previous_evt && temp_evt.data.core_event_id && (previous_evt.data.core_event_id === temp_evt.data.core_event_id)) {
				temp_evt.hide_header();
				sequenced_margin = true;
			}
			else {
				temp_evt.show_header();
				sequenced_margin = false;
			}
			new_events.push(temp_evt);
			previous_evt = temp_evt;
			if (first_time) {
				temp_evt.el.style.marginTop = "100%";
			}
			else if (!temp_evt.el.style.marginTop) {
				temp_evt.el.style.marginTop = SCREEN_HEIGHT + "px";
			}
			Fx.delay_css_setting(temp_evt.el, "marginTop", sequenced_margin ? "0px" : "30px");
			if (!temp_evt.el.parentNode) self.el.appendChild(temp_evt.el);
			if (MOBILE) break;
		}

		// Erase old elements out before we replace the self.events with new_events
		for (i = 0; i < self.events.length; i++) {
			if (self.events[i].pending_delete) {
				$add_class(self.events[i].el, "timeline_event_closing");
				self.events[i].el.style.marginTop = "-" + now_playing_size + "px";
				Fx.remove_element(self.events[i].el);
			}
		}
		self.events = new_events;

		if (first_time) {
			first_time = false;
		}

		// The now playing bar
		Clock.set_page_title(current_event.songs[0].data.albums[0].name + " - " + current_event.songs[0].data.title, current_event.end);
		if ((current_event.end - Clock.now) > 0) {
			current_event.progress_bar_start();
		}
	};

	self.scrollbar_recalculate = function() {
		timeline_scrollbar.recalculate();
		timeline_scrollbar.refresh();
	};

	var find_event = function(id) {
		for (var i = 0; i < self.events.length; i++) {
			if (id == self.events[i].id) {
				return self.events[i];
			}
		}
		return null;
	};

	var find_and_update_event = function(event_json) {
		var evt = find_event(event_json.id);
		if (!evt) {
			return Event.load(event_json);	
		}
		else {
			evt.update(event_json);
			evt.pending_delete = false;
			return evt;
		}
	};

	self.register_vote = function(json) {
		if (!json.success) return;
		for (var i = 0; i < self.events.length; i++) {
			if (self.events[i].id == json.elec_id) {
				self.events[i].register_vote(json.entry_id);
			}
		}
	};

	self.rate_current_song = function(new_rating) {
		if (current_event.songs[0].data.rating_allowed) {
			current_event.songs[0].rate(new_rating);
		}
		else {
			throw({ "is_rw": true, "tl_key": "cannot_rate_now" });
		}
	};

	self.vote = function(which_election, song_position) {
		if ((which_election < 0) || (which_election >= sched_next.length)) {
			throw({ "is_rw": true, "tl_key": "invalid_hotkey_vote" });
		}

		if (!(sched_next[which_election].type == "Election")) {
			throw({ "is_rw": true, "tl_key": "not_an_election" });
		}

		if (!sched_next[which_election].voting_allowed) {
			throw({ "is_rw": true, "tl_key": "cannot_vote_for_this_now"});
		}

		if ((song_position < 0) || (song_position > sched_next[which_election].songs.length)) {
			throw({ "is_rw": true, "tl_key": "invalid_hotkey_vote"});
		}

		find_event(sched_next[which_election].id).songs[song_position].vote();
	};

	self.tune_in_voting_allowed_check = function(json) {
		var evt, i;
		if (!sched_next) return;
		if (json.tuned_in && (!json.locked || (json.lock_sid == BOOTSTRAP.sid))) {
			for (i = 0; i < sched_next.length; i++) {
				evt = find_event(sched_next[i].id);
				if (evt) {
					evt.data.voting_allowed = true;
					evt.enable_voting();
				}
				if (!json.perks) break;
			}
		}
		else {
			for (i = 0; i < sched_next.length; i++) {
				evt = find_event(sched_next[i].id)
				if (evt) {
					evt.data.voting_allowed = false;
					evt.disable_voting();
				}
			}
		}
	};

	self.get_current_song_rating = function() {
		if (current_event && current_event.songs && (current_event.songs.length > 0)) {
			return current_event.songs[0].song_rating.rating_user;
		}
		return null;
	}

	return self;
}();
