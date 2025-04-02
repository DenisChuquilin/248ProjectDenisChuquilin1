const API_KEY = 'AIzaSyA9_sTDUIGb8lSVBqshRFFfgLm_nkMJ9sE';

export const searchYouTubeVideo = async (recipeName) => {
  try {
    const searchQuery = `${recipeName} recipe how to cook`;
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(searchQuery)}&type=video&videoDuration=medium&key=${API_KEY}`
    );
    
    if (!response.ok) throw new Error('YouTube API request failed');
    
    const data = await response.json();
    if (data.items?.[0]?.id?.videoId) {
      return `https://www.youtube.com/watch?v=${data.items[0].id.videoId}`;
    }
    return null;
  } catch (error) {
    console.error('YouTube search error:', error);
    return null;
  }
}; 