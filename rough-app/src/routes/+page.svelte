<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let userName = $state('');
	let apiKey = $state('');
	let showWelcome = $state(true);
	let isConnecting = $state(false);
	let errorMessage = $state('');
	let showApiKey = $state(false);

	async function startApp() {
		if (userName.trim() && apiKey.trim()) {
			isConnecting = true;
			errorMessage = '';

			try {
				// First test if API key is valid
				const apiTestResult = await testPineconeConnection(apiKey.trim());

				// Now check if user exists or create new user
				const userResult = await checkOrCreateUser(userName.trim(), apiKey.trim());

				if (userResult.success) {
					localStorage.setItem('userName', userName.trim());
					localStorage.setItem('pineconeApiKey', apiKey.trim());
					localStorage.setItem('pineconeConnected', 'true');
					goto('/workspace');
				} else {
					errorMessage = userResult.message;
					isConnecting = false;
				}
			} catch (error) {
				console.error('Connection error:', error);
				errorMessage = 'Invalid Pinecone API key. Please check and try again.';
				isConnecting = false;
			}
		}
	}

	async function testPineconeConnection(key) {
		try {
			const response = await fetch('/create-index', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: key,
					cloud: 'aws',
					region: 'us-east-1'
				})
			});

			if (!response.ok) {
				const errorData = await response.text();
				console.error('API response error:', errorData);
				throw new Error('API key validation failed');
			}

			return await response.json();
		} catch (error) {
			console.error('API connection error:', error);
			throw error;
		}
	}

	async function checkOrCreateUser(username, apiKey) {
		try {
			// First try to search for existing user data
			const searchResponse = await fetch('/search-note', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: apiKey,
					text: `User: ${username}`
				})
			});

			if (searchResponse.ok) {
				const searchResults = await searchResponse.json();

				if (searchResults.matches && searchResults.matches.length > 0) {
					// Check if any of the matches contain the exact username
					const userMatch = searchResults.matches.find(match => {
						if (match.metadata && match.metadata.text) {
							return match.metadata.text.includes(`User: ${username}\n`) ||
								   match.metadata.text.startsWith(`User: ${username}`);
						}
						return false;
					});

					if (userMatch) {
						return { success: true, message: 'Welcome back!' };
					} else {
						// User searched but no exact match found
						return { success: false, message: 'Username is incorrect. Please check and try again.' };
					}
				} else {
					// New user, create entry
					const createResponse = await fetch('/insert-note', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							apiKey: apiKey,
							fullText: `User: ${username}\nAccount created: ${new Date().toISOString()}\nTodos: []`
						})
					});

					if (createResponse.ok) {
						return { success: true, message: 'Welcome! New account created.' };
					} else {
						return { success: false, message: 'Failed to create user account.' };
					}
				}
			} else {
				return { success: false, message: 'Failed to validate user.' };
			}
		} catch (error) {
			console.error('User validation error:', error);
			return { success: false, message: 'Error validating user account.' };
		}
	}

	onMount(() => {
		const savedName = localStorage.getItem('userName');
		const pineconeConnected = localStorage.getItem('pineconeConnected');
		const apiKey = localStorage.getItem('pineconeApiKey');

		if (savedName && pineconeConnected && apiKey) {
			goto('/workspace');
		}
	});
</script>

<div class="welcome-container">
	<div class="hero-section">
		<div class="floating-elements">
			<div class="floating-card card-1"></div>
			<div class="floating-card card-2"></div>
			<div class="floating-card card-3"></div>
		</div>
		
		<div class="main-content">
			<h1 class="title">TaskFlow</h1>
			<p class="subtitle">Your beautiful, organized workspace for everything</p>
			
			<div class="input-container">
				<input
					type="text"
					placeholder="What's your name?"
					bind:value={userName}
					class="name-input"
					onkeypress={(e) => e.key === 'Enter' && document.querySelector('.api-input').focus()}
				/>
				<div class="api-input-container">
					<input
						type={showApiKey ? 'text' : 'password'}
						placeholder="Enter your Pinecone.io API key (e.g., pcsk_...)"
						bind:value={apiKey}
						class="api-input"
						onkeypress={(e) => e.key === 'Enter' && startApp()}
					/>
					<button type="button" class="toggle-api-visibility" onclick={() => showApiKey = !showApiKey}>
						{#if showApiKey}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
				{#if errorMessage}
					<div class="error-message">{errorMessage}</div>
				{/if}
				{#if isConnecting}
					<div class="info-message">
						<span class="loading-spinner"></span>
						Testing API connection and validating user...
					</div>
				{/if}
				<button class="start-button" onclick={startApp} disabled={!userName.trim() || !apiKey.trim() || isConnecting}>
					{#if isConnecting}
						<span class="loading-spinner"></span>
						Connecting to Pinecone...
					{:else}
						Connect & Get Started
					{/if}
				</button>
				<div class="api-info">
					<p><strong>🔗 Get your Pinecone API key:</strong></p>
					<p>1. Go to <a href="https://pinecone.io" target="_blank" rel="noopener">pinecone.io</a></p>
					<p>2. Sign in to your account</p>
					<p>3. Navigate to API Keys section</p>
					<p>4. Copy your API key (starts with "pcsk_")</p>
				</div>
			</div>
			
			<div class="features-preview">
				<div class="feature-item">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
							<path d="M15 5l4 4"/>
						</svg>
					</div>
					<span>Rich Text Editing</span>
				</div>
				<div class="feature-item">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
							<polyline points="9,22 9,12 15,12 15,22"/>
							<rect x="7" y="14" width="2" height="2"/>
							<rect x="15" y="14" width="2" height="2"/>
						</svg>
					</div>
					<span>Organize & Categorize</span>
				</div>
				<div class="feature-item">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="11" cy="11" r="8"/>
							<path d="m21 21-4.35-4.35"/>
						</svg>
					</div>
					<span>Powerful Search</span>
				</div>
				<div class="feature-item">
					<div class="feature-icon">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
							<line x1="8" y1="21" x2="16" y2="21"/>
							<line x1="12" y1="17" x2="12" y2="21"/>
						</svg>
					</div>
					<span>Responsive Design</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.welcome-container {
		min-height: 100vh;
		background: linear-gradient(135deg,
			#6366f1 0%,
			#8b5cf6 25%,
			#ec4899 50%,
			#f59e0b 75%,
			#10b981 100%);
		background-attachment: fixed;
		background-size: 400% 400%;
		animation: gradientShift 8s ease infinite;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}

	@keyframes gradientShift {
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
	}

	.floating-elements {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		pointer-events: none;
	}

	.floating-card {
		position: absolute;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.card-1 {
		width: 120px;
		height: 80px;
		top: 20%;
		left: 10%;
		animation: float 6s ease-in-out infinite;
	}

	.card-2 {
		width: 100px;
		height: 100px;
		top: 60%;
		right: 15%;
		animation: float 8s ease-in-out infinite reverse;
	}

	.card-3 {
		width: 80px;
		height: 120px;
		bottom: 30%;
		left: 20%;
		animation: float 7s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0px) rotate(0deg); }
		50% { transform: translateY(-20px) rotate(5deg); }
	}

	.hero-section {
		position: relative;
		z-index: 10;
		text-align: center;
		max-width: 600px;
		padding: 2rem;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}

	.title {
		font-size: clamp(3rem, 8vw, 6rem);
		font-weight: 800;
		color: white;
		margin-bottom: 1rem;
		text-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		letter-spacing: -2px;
	}

	.subtitle {
		font-size: clamp(1.2rem, 3vw, 1.5rem);
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 3rem;
		font-weight: 300;
		line-height: 1.6;
	}

	.input-container {
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(20px);
		border-radius: 25px;
		padding: 1.5rem;
		margin-bottom: 3rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		position: relative;
		z-index: 15;
	}

	.name-input {
		width: 100%;
		padding: 1rem 1.5rem;
		border: none;
		border-radius: 15px;
		font-size: 1.1rem;
		background: rgba(255, 255, 255, 0.9);
		margin-bottom: 1rem;
		outline: none;
		transition: all 0.3s ease;
		position: relative;
		z-index: 20;
		pointer-events: auto;
		cursor: text;
	}

	.name-input:focus {
		background: white;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.api-input-container {
		position: relative;
		margin-bottom: 1rem;
	}

	.api-input {
		width: 100%;
		padding: 1rem 3rem 1rem 1.5rem;
		border: none;
		border-radius: 15px;
		font-size: 1rem;
		background: rgba(255, 255, 255, 0.9);
		outline: none;
		transition: all 0.3s ease;
		position: relative;
		z-index: 20;
		pointer-events: auto;
		cursor: text;
		font-family: monospace;
		box-sizing: border-box;
	}

	.api-input:focus {
		background: white;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.toggle-api-visibility {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		cursor: pointer;
		color: #6b7280;
		z-index: 25;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.toggle-api-visibility:hover {
		background: rgba(0, 0, 0, 0.05);
		color: #374151;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: 0.75rem 1rem;
		border-radius: 10px;
		margin-bottom: 1rem;
		border: 1px solid rgba(239, 68, 68, 0.2);
		font-size: 0.9rem;
		text-align: center;
	}

	.api-info {
		background: rgba(255, 255, 255, 0.1);
		padding: 1rem;
		border-radius: 15px;
		margin-top: 1rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.api-info p {
		margin: 0.5rem 0;
	}

	.api-info a {
		color: #60a5fa;
		text-decoration: none;
		font-weight: 600;
	}

	.api-info a:hover {
		text-decoration: underline;
	}

	.loading-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 1s ease-in-out infinite;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.start-button {
		width: 100%;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
		color: white;
		border: none;
		border-radius: 15px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 10px 25px rgba(238, 90, 36, 0.3);
		position: relative;
		z-index: 20;
	}

	.start-button:hover:not(:disabled) {
		transform: translateY(-3px);
		box-shadow: 0 15px 35px rgba(238, 90, 36, 0.4);
	}

	.start-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.features-preview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1.5rem;
		max-width: 500px;
		margin: 0 auto;
	}

	.feature-item {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 15px;
		padding: 1.5rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		transition: all 0.3s ease;
		color: white;
	}

	.feature-item:hover {
		transform: translateY(-5px);
		background: rgba(255, 255, 255, 0.15);
	}

	.feature-icon {
		margin-bottom: 0.75rem;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 48px;
		height: 48px;
		margin: 0 auto 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: white;
	}

	.feature-icon svg {
		width: 24px;
		height: 24px;
		stroke: currentColor;
		stroke-width: 2;
		fill: none;
	}

	@media (max-width: 768px) {
		.features-preview {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}
		
		.hero-section {
			padding: 1rem;
		}
		
		.input-container {
			padding: 1rem;
			margin-bottom: 2rem;
		}

		.welcome-container {
			padding: 1rem;
		}

		.title {
			font-size: clamp(2.5rem, 8vw, 4rem);
			margin-bottom: 0.75rem;
		}

		.subtitle {
			font-size: clamp(1rem, 4vw, 1.2rem);
			margin-bottom: 2rem;
		}

		.floating-card {
			display: none;
		}
	}
</style>
