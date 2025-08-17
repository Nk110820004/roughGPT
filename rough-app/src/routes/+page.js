import { browser } from '$app/environment';

/** @type {import('./$types').PageLoad} */
export function load() {
	// Preload data for better performance
	const title = 'TaskFlow - Beautiful Task Management';
	const description = 'Your beautiful, organized workspace for everything';
	
	// Check if user is already logged in (only in browser)
	let hasUser = false;
	if (browser) {
		hasUser = !!localStorage.getItem('userName');
	}
	
	return {
		title,
		description,
		hasUser,
		// Meta data for SEO
		meta: {
			title: 'TaskFlow - Beautiful Task Management',
			description: 'Organize your tasks with a beautiful, Notion-like interface. Create, manage, and track your todos with style.',
			keywords: 'todo, task management, productivity, notion, organize, beautiful ui',
			image: '/og-image.png'
		}
	};
}
