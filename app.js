const state = {
  currentStoryIndex: null,
  currentEnding: null,
  videosToPreload: new Set(),
};

let audioUnlocked = false;

const stories = [
  {
    id: 'story-1',
    introVideo: 'Assets/Son of the Dragon 1.mp4',
    choices: [
      { id: 'a', label: 'Choice A', video: 'Assets/Son of the Dragon 2a.mp4' },
      { id: 'b', label: 'Choice B', video: 'Assets/Son of the Dragon 2a.mp4' },
    ],
  },
  {
    id: 'story-2',
    introVideo: 'Assets/Son of the Dragon 1.mp4',
    choices: [
      { id: 'a', label: 'Choice A', video: 'Assets/Son of the Dragon 2a.mp4' },
      { id: 'b', label: 'Choice B', video: 'Assets/Son of the Dragon 2a.mp4' },
    ],
  },
  {
    id: 'story-3',
    introVideo: 'Assets/Son of the Dragon 1.mp4',
    choices: [
      { id: 'a', label: 'Choice A', video: 'Assets/Son of the Dragon 2a.mp4' },
      { id: 'b', label: 'Choice B', video: 'Assets/Son of the Dragon 2a.mp4' },
    ],
  },
];

const elements = {
  bootScreen: document.getElementById('boot-screen'),
  menuScreen: document.getElementById('menu-screen'),
  storyScreen: document.getElementById('story-screen'),
  storyGrid: document.getElementById('story-grid'),
  bootVideo: document.getElementById('boot-video'),
  storyVideo: document.getElementById('story-video'),
  decisionOverlay: document.getElementById('decision-overlay'),
  choiceButtons: [...document.querySelectorAll('.choice-button')],
};

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function preloadVideo(url) {
  if (!url || !url.length) return;

  const existing = state.videosToPreload;
  if (existing.has(url)) return;
  existing.add(url);

  const video = document.createElement('video');
  video.preload = 'auto';
  video.src = url;
  video.load();
}

function setScreen(screenName) {
  const screens = ['boot-screen', 'menu-screen', 'story-screen'];

  screens.forEach((screenId) => {
    const node = document.getElementById(screenId);
    if (!node) return;
    const active = screenId === screenName;
    node.classList.toggle('active', active);
    node.classList.toggle('hidden', !active);
  });
}

function renderMenu() {
  const hotspots = [
    { storyId: 'story-1', style: 'left: 0%; top: 0%; width: 33.333%; height: 100%;' },
    { storyId: 'story-2', style: 'left: 33.333%; top: 0%; width: 33.333%; height: 100%;' },
    { storyId: 'story-3', style: 'left: 66.666%; top: 0%; width: 33.333%; height: 100%;' },
  ];

  elements.storyGrid.innerHTML = hotspots
    .map(
      ({ storyId, style }) => `
        <button
          class="story-hotspot"
          type="button"
          data-story-id="${storyId}"
          style="${style}"
          aria-label="Play story"
        ></button>
      `
    )
    .join('');

  elements.storyGrid.querySelectorAll('.story-hotspot').forEach((button) => {
    button.addEventListener('click', () => {
      const selectedStory = stories.find((story) => story.id === button.dataset.storyId);
      if (!selectedStory) return;
      startStory(selectedStory);
    });
  });
}

function buildChoiceButtons(story) {
  const buttons = elements.choiceButtons;

  buttons.forEach((button, index) => {
    const choice = story.choices[index];
    const hasChoice = Boolean(choice);

    button.dataset.choice = hasChoice ? choice.id : '';
    button.disabled = !hasChoice;
    button.classList.toggle('choice-a', hasChoice && index === 0);
    button.classList.toggle('choice-b', hasChoice && index === 1);
    button.classList.toggle('hidden', !hasChoice);

    const labelNode = button.querySelector('.choice-text');
    if (labelNode) {
      labelNode.textContent = hasChoice
        ? choice.label || choice.id || `Choice ${index + 1}`
        : '';
    }
  });
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  const videos = [elements.bootVideo, elements.storyVideo].filter(Boolean);

  videos.forEach((video) => {
    video.muted = false;
    if (!video.paused) {
      video.play().catch(() => {});
    }
  });
}

async function startBootSequence() {
  const openingVideo = 'Assets/Son of the Dragon 1.mp4';
  elements.bootVideo.src = openingVideo;
  elements.bootVideo.muted = true;
  elements.bootVideo.playsInline = true;
  elements.bootVideo.autoplay = true;
  elements.bootVideo.loop = false;

  elements.bootVideo.addEventListener('click', unlockAudio, { once: true });
  elements.bootVideo.addEventListener('pointerdown', unlockAudio, { once: true });
  elements.bootVideo.addEventListener('touchstart', unlockAudio, { once: true });
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
  document.addEventListener('click', unlockAudio, { once: true });

  try {
    await elements.bootVideo.play();
  } catch (error) {
    elements.bootVideo.muted = true;
    try {
      await elements.bootVideo.play();
    } catch (innerError) {
      console.warn('Boot video could not autoplay', innerError);
    }
  }

  elements.bootVideo.addEventListener('ended', () => {
    renderMenu();
    setScreen('menu-screen');
  }, { once: true });
}

function startStory(story) {
  state.currentStoryIndex = stories.findIndex((item) => item.id === story.id);
  state.currentEnding = null;

  elements.storyVideo.src = story.introVideo;
  elements.storyVideo.muted = false;
  elements.storyVideo.playsInline = true;
  elements.storyVideo.autoplay = true;
  elements.storyVideo.loop = false;
  elements.storyVideo.currentTime = 0;

  buildChoiceButtons(story);
  hideChoices();
  setScreen('story-screen');

  elements.storyVideo.onended = () => {
    showChoices(story);
  };

  elements.storyVideo.play().catch(() => {
    elements.storyVideo.muted = true;
    elements.storyVideo.play().catch(() => {});
  });

  const videoUrls = [story.introVideo, ...story.choices.map((choice) => choice.video)];
  videoUrls.forEach((url) => preloadVideo(url));
}

function hideChoices() {
  elements.decisionOverlay.classList.add('hidden');
}

function showChoices(story) {
  buildChoiceButtons(story);

  const choiceA = story.choices[0];
  const choiceB = story.choices[1];

  if (choiceA) preloadVideo(choiceA.video);
  if (choiceB) preloadVideo(choiceB.video);

  elements.decisionOverlay.classList.remove('hidden');
}

function playEnding(story, choiceId) {
  const storyChoices = story.choices || [];
  const selected = storyChoices.find((choice) => choice.id === choiceId) || storyChoices[0];

  if (!selected) {
    returnToMenu();
    return;
  }

  state.currentEnding = selected.video;
  elements.storyVideo.src = selected.video;
  elements.storyVideo.muted = false;
  elements.storyVideo.playsInline = true;
  elements.storyVideo.autoplay = true;
  elements.storyVideo.currentTime = 0;
  elements.storyVideo.loop = false;
  elements.storyVideo.onended = () => {
    returnToMenu();
  };

  hideChoices();
  elements.storyVideo.play().catch(() => {
    elements.storyVideo.muted = true;
    elements.storyVideo.play().catch(() => {});
  });

  preloadVideo(selected.video);
}

function returnToMenu() {
  elements.storyVideo.pause();
  hideChoices();
  renderMenu();
  setScreen('menu-screen');
}

document.querySelectorAll('.choice-button').forEach((button) => {
  button.addEventListener('click', () => {
    const currentStory = stories[state.currentStoryIndex];
    if (!currentStory) return;
    playEnding(currentStory, button.dataset.choice);
  });
});

window.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  renderMenu();
  startBootSequence();
});
