import tornado.web

from api import fieldtypes
from api.web import RequestHandler
from api.server import test_get
from api.server import test_post
from api.server import handle_api_url
from api import fieldtypes
import api_requests.info

from libs import cache
from libs import log
from rainwave import playlist

sessions = {}

@handle_api_url("sync_update_all")
class SyncUpdateAll(RequestHandler):
	local_only = True
	auth_required = False
			
	def post(self):
		if self.request_ok:
			self.write("Processing.")
	
	def on_finish(self):
		if not self.request_ok:
			log.debug("sync_update_all", "sync_update_all request was not OK.")
			return
		log.debug("sync_update_all", "Updating all sessions for sid %s" % self.sid)
		cache.update_local_cache_for_sid(self.sid)
		
		if self.sid in sessions:
			for session in sessions[self.sid]:
				session.update()
		sessions[self.sid] = []
		
@handle_api_url("sync_update_user")
class SyncUpdateUser(RequestHandler):
	sid_required = False
	local_only = True

	def post(self):
		if self.request_ok:
			self.write("Processing.")
			
	def on_finish(self):
		if not self.request_ok:
			log.debug("sync_update_user", "sync_update_all request was not OK.")
			return

		user_id = long(self.request.arguments['user_id'])
		for sid in sessions:
			for session in sessions[sid]:
				if session.user.id == user_id:
					session.update_user()
					sessions[sid].remove(session)
					return
			
@handle_api_url("sync_update_ip")
class SyncUpdateIP(RequestHandler):
	sid_required = False
	local_only = True
			
	def post(self):
		if self.request_ok:
			self.write("Processing.")
			
	def on_finish(self):
		if not self.request_ok:
			log.debug("sync_update_ip", "sync_update_all request was not OK.")
			return
			
		ip_address = long(self.request.arguments['ip_address'])
		for sid in sessions:
			for session in sessions[sid]:
				if session.request.remote_ip == ip_address:
					session.update_user()
					sessions[sid].remove(session)
					return

@handle_api_url("sync")
class Sync(RequestHandler):
	auth_required = True
	
	@tornado.web.asynchronous
	def post(self):
		self.set_header("Content-Type", "application/json")
		if "init" in self.request.arguments:
			self.update()
		else:
			if not self.user.request_sid in sessions:
				sessions[self.user.request_sid] = []
			sessions[self.user.request_sid].append(self)
		
	def update(self):
		api_requests.info.attach_info_to_request(self)
		self.finish()
	
	def update_user(self):
		self.user.refresh()
		self.append("user", self.user.to_private_dict())
		self.finish()