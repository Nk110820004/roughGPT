const CACHE_NAME = 'taskflow-v1';
const STATIC_ASSETS = [
	'/',
	'/workspace',
	'/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => cache.addAll(STATIC_ASSETS))
			.then(() => self.skipWaiting())
	);
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((cacheName) => cacheName !== CACHE_NAME)
						.map((cacheName) => caches.delete(cacheName))
				);
			})
			.then(() => self.clients.claim())
	);
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
	// Skip non-GET requests
	if (event.request.method !== 'GET') return;
	
	// Skip external requests
	if (!event.request.url.startsWith(self.location.origin)) return;
	
	event.respondWith(
		caches.match(event.request)
			.then((cachedResponse) => {
				// Return cached version if available
				if (cachedResponse) {
					return cachedResponse;
				}
				
				// Otherwise fetch from network
				return fetch(event.request)
					.then((response) => {
						// Only cache successful responses
						if (response.status === 200) {
							const responseClone = response.clone();
							caches.open(CACHE_NAME)
								.then((cache) => {
									cache.put(event.request, responseClone);
								});
						}
						return response;
					})
					.catch(() => {
						// Return offline page if available
						if (event.request.destination === 'document') {
							return caches.match('/');
						}
					});
			})
	);
});

// Background sync for offline task creation
self.addEventListener('sync', (event) => {
	if (event.tag === 'background-sync-tasks') {
		event.waitUntil(syncTasks());
	}
});

async function syncTasks() {
	// Handle background sync of tasks when connection is restored
	const pendingTasks = await getStoredTasks();
	// Implementation would depend on your backend API
	console.log('Syncing pending tasks:', pendingTasks);
}

async function getStoredTasks() {
	// Get tasks from IndexedDB or localStorage
	return [];
}
