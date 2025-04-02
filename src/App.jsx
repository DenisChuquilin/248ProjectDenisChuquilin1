import { useState } from 'react'
import { Label, Pie, PieChart, LineChart, XAxis, YAxis, CartesianGrid, Line } from "recharts"
import { GoogleGenerativeAI } from "@google/generative-ai"
import './App.css'

function App() {
  const [ingredients, setIngredients] = useState(['', '', ''])
  const [recipe, setRecipe] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastUsedIngredients, setLastUsedIngredients] = useState([]);
  const [recipeCount, setRecipeCount] = useState(0);
  const [recipeInfo, setRecipeInfo] = useState({
    ingredients: '',
    recipe: '',
    nutritionalFacts: '',
    youtubeLink: ''
  });
  const [expandedSection, setExpandedSection] = useState('');
  const [recipeHistory, setRecipeHistory] = useState([]);

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = value
    setIngredients(newIngredients)
    // Clear recipe history when ingredients change
    setRecipeHistory([]);
  }

  const searchYouTubeVideo = async (recipeName) => {
    console.log('Searching for video:', recipeName);
    const API_KEY = 'AIzaSyA9_sTDUIGb8lSVBqshRFFfgLm_nkMJ9sE';
    try {
      // Simplify the search query to improve results
      const searchQuery = `${recipeName} recipe how to cook`;
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(searchQuery)}&type=video&videoDuration=medium&key=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('YouTube API request failed');
      }
      
      const data = await response.json();
      console.log('YouTube API response:', data);
      
      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log('Found video URL:', videoUrl);
        return videoUrl;
      }
      return null;
    } catch (error) {
      console.error('YouTube search error:', error);
      return null;
    }
  };

  const generateRecipe = async (ingredientsToUse = ingredients, isAlternative = false) => {
    setLoading(true);
    // Clear previous recipe info immediately when generating new recipe
    setRecipeInfo({
      ingredients: '',
      recipe: '',
      nutritionalFacts: '',
      youtubeLink: ''
    });
    
    try {
      setLastUsedIngredients(ingredientsToUse.filter(ing => ing.trim() !== ''));
      
      const API_KEY = 'AIzaSyA9_sTDUIGb8lSVBqshRFFfgLm_nkMJ9sE';
      const prompt = isAlternative 
        ? `Create a brief, healthy recipe using these ingredients: ${ingredientsToUse.join(', ')}.
           Must be different from: ${recipeHistory.join(', ')}.
           
           Rules:
           1. Recipe name: Include main ingredients (keep under 60 characters)
           2. Ingredients: List each ingredient on a new line with exact measurements
           3. Directions: 2-3 clear steps (MAX 100 WORDS TOTAL)
           4. Be specific but concise
           
           Format:
           Recipe Name: (Name with main ingredients)
           
           Ingredients:
           - [amount] ingredient 1
           - [amount] ingredient 2
           - [amount] ingredient 3
           (List each ingredient with measurements, one per line)
           
           Directions: (Keep under 100 words)
           1. Brief, clear steps
           2. Include temperatures and times
           3. Final presentation
           
           Nutrition Facts:
           Calories: [number] kcal
           Protein: [number]g
           Carbs: [number]g
           Fat: [number]g
           Fiber: [number]g`
        : `Create a brief, healthy recipe using: ${ingredientsToUse.join(', ')}.
           
           Rules:
           1. Recipe name: Include main ingredients (keep under 60 characters)
           2. Ingredients: List each ingredient on a new line with exact measurements
           3. Directions: 2-3 clear steps (MAX 100 WORDS TOTAL)
           4. Be specific but concise
           
           Format:
           Recipe Name: (Name with main ingredients)
           
           Ingredients:
           - [amount] ingredient 1
           - [amount] ingredient 2
           - [amount] ingredient 3
           (List each ingredient with measurements, one per line)
           
           Directions: (Keep under 100 words)
           1. Brief, clear steps
           2. Include temperatures and times
           3. Final presentation
           
           Nutrition Facts:
           Calories: [number] kcal
           Protein: [number]g
           Carbs: [number]g
           Fat: [number]g
           Fiber: [number]g`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 1.0,
            topK: 40,
            topP: 0.95,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const generatedText = data.candidates[0].content.parts[0].text;
        console.log('Full generated text:', generatedText); // Debug log
        
        // Split by sections more reliably
        const recipeName = generatedText.match(/Recipe Name:([^\n]*)/)?.[1]?.trim() || '';
        
        // Extract ingredients section
        const wordCount = (text) => text.trim().split(/\s+/).length;
        const ingredientsMatch = generatedText.match(/Ingredients:([\s\S]*?)(?=Directions:|$)/);
        let ingredientSection = '';
        if (ingredientsMatch) {
          // Split into lines and process each line
          const ingredientLines = ingredientsMatch[1]
            .trim()
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && line !== '-' && !line.includes('Keep under 100 words')); // Remove formatting lines

          // Join the lines back together
          ingredientSection = ingredientLines.join('\n');
        }

        // Truncate if over 100 words
        if (wordCount(ingredientSection) > 100) {
          const words = ingredientSection.split(/\s+/);
          ingredientSection = words.slice(0, 100).join(' ');
        }

        // Extract directions section
        const directionsMatch = generatedText.match(/Directions:([\s\S]*?)(?=Nutrition Facts:|$)/);
        let directionsSection = directionsMatch
          ? directionsMatch[1]
              .trim()
              .split('\n')
              .map(line => line.trim())
              .filter(line => line && !line.startsWith('-'))
              .join('\n')
          : '';

        // Truncate if over 100 words
        if (wordCount(directionsSection) > 100) {
          const words = directionsSection.split(/\s+/);
          directionsSection = words.slice(0, 100).join(' ');
        }

        // Extract nutrition facts
        const nutritionMatch = generatedText.match(/Nutrition Facts:([\s\S]*?)$/);
        let nutritionSection = nutritionMatch
          ? nutritionMatch[1]
              .trim()
              .split('\n')
              .map(line => line.trim())
              .filter(line => line)
              .join('\n')
          : '';

        // If nutrition facts are missing, provide estimated values
        if (!nutritionSection) {
          nutritionSection = `Calories: ~300 kcal
Protein: ~10 g
Carbs: ~40 g
Fat: ~15 g
Fiber: ~5 g`;
        }

        console.log('Parsed sections:', {
          name: recipeName,
          ingredients: ingredientSection,
          directions: directionsSection,
          nutrition: nutritionSection
        });

        // Check if this recipe name has been used before
        if (isAlternative && recipeHistory.includes(recipeName)) {
          throw new Error('Recipe too similar to previous versions. Please try again.');
        }

        // Add the new recipe name to history
        setRecipeHistory(prev => [...prev, recipeName]);

        // Search for new YouTube video with new recipe name
        try {
          const youtubeLink = await searchYouTubeVideo(recipeName);
          console.log('Setting new YouTube link:', youtubeLink);
          
          // Update all recipe info at once with new data
          setRecipeInfo({
            ingredients: ingredientSection,
            recipe: directionsSection,
            nutritionalFacts: nutritionSection,
            youtubeLink: youtubeLink || ''
          });
        } catch (error) {
          console.error('Error fetching YouTube video:', error);
          // Still update recipe info even if YouTube search fails
          setRecipeInfo({
            ingredients: ingredientSection,
            recipe: directionsSection,
            nutritionalFacts: nutritionSection,
            youtubeLink: ''
          });
        }

        setRecipe(recipeName);
        setRecipeCount(prev => prev + 1);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error details:', error);
      setRecipe('Error generating recipe. Please try again. Error: ' + error.message);
      // Clear all recipe info on error
      setRecipeInfo({
        ingredients: '',
        recipe: '',
        nutritionalFacts: '',
        youtubeLink: ''
      });
    }
    setLoading(false);
  };

  const generateAlternativeRecipe = () => {
    if (ingredients.filter(ing => ing.trim()).length >= 3) {
      // Reset recipe count if it gets too high to avoid diluting specificity
      if (recipeCount > 5) {
        setRecipeCount(0);
        setRecipeHistory([]);
      }
      // Clear previous recipe info before generating new one
      setRecipeInfo({
        ingredients: '',
        recipe: '',
        nutritionalFacts: '',
        youtubeLink: ''
      });
      generateRecipe(ingredients, true);
    }
  };

  const handleIngredientClick = (ingredient) => {
    // Find the first empty input box
    const emptyIndex = ingredients.findIndex(ing => !ing.trim());
    if (emptyIndex !== -1) {
      const newIngredients = [...ingredients];
      newIngredients[emptyIndex] = ingredient;
      setIngredients(newIngredients);
    }
  };

  const scrollToAbout = () => {
    document.getElementById('about-us').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div className="header-bar">
        <div className="header-left">
          <img src="/logo.png" alt="Food Fixer Logo" className="header-logo" />
          <span className="header-text">Food Fixer</span>
        </div>
        <nav className="nav-links">
          <button onClick={scrollToAbout} className="nav-link">About Us</button>
        </nav>
      </div>
      <div className="container">
        <header>
          <h1>Food Fixer</h1>
        </header>
        
        <h2>Welcome to Food Fixer</h2>
        
        <div className="main-content">
          <div className="left-section">
            <h3>Enter Ingredients</h3>
            <div className="ingredients-form">
              {ingredients.map((ingredient, index) => (
                <input
                  key={index}
                  type="text"
                  value={ingredient}
                  onChange={(e) => handleIngredientChange(index, e.target.value)}
                  placeholder={`Ingredient ${index + 1}`}
                  className="ingredient-input"
                />
              ))}
              <div className="button-group">
                <button 
                  onClick={() => generateRecipe(ingredients)}
                  disabled={loading || ingredients.filter(ing => ing.trim()).length < 3}
                  className="find-recipe-button"
                >
                  {loading ? 'Generating...' : 'Find Recipe'}
                </button>
                {recipe && (
                  <button 
                    onClick={generateAlternativeRecipe}
                    disabled={loading || ingredients.filter(ing => ing.trim()).length < 3}
                    className="refresh-button"
                    title="Generate another recipe with the same ingredients"
                  >
                    ↻
                  </button>
                )}
              </div>
            </div>

            <div className="popular-ingredients">
              <h3>Popular Ingredients</h3>
              <div className="ingredient-icons">
                <div 
                  className="ingredient-item"
                  onClick={() => handleIngredientClick('Chicken')}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="ingredient-icon">🍗</span>
                  <span>Chicken</span>
                </div>
                <div 
                  className="ingredient-item"
                  onClick={() => handleIngredientClick('Rice')}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="ingredient-icon">🍚</span>
                  <span>Rice</span>
                </div>
                <div 
                  className="ingredient-item"
                  onClick={() => handleIngredientClick('Steak')}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="ingredient-icon">🥩</span>
                  <span>Steak</span>
                </div>
                <div 
                  className="ingredient-item"
                  onClick={() => handleIngredientClick('Lettuce')}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="ingredient-icon">🥬</span>
                  <span>Lettuce</span>
                </div>
                <div 
                  className="ingredient-item"
                  onClick={() => handleIngredientClick('Tomato')}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="ingredient-icon">🍅</span>
                  <span>Tomato</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {recipe && (
          <div className="recipe-result">
            <h3>{recipe}</h3>
            <div className="recipe-content">
              <div className="collapsible-section">
                <button 
                  className={`collapse-button ${expandedSection === 'ingredients' ? 'active' : ''}`}
                  onClick={() => setExpandedSection(expandedSection === 'ingredients' ? '' : 'ingredients')}
                >
                  Ingredients ▼
                </button>
                {expandedSection === 'ingredients' && (
                  <div className="collapse-content">
                    {recipeInfo.ingredients.split('\n').map((ingredient, index) => {
                      // Skip empty lines and formatting instructions
                      if (!ingredient.trim() || ingredient.includes('Keep under')) return null;
                      return (
                        <p key={index} className="content-line">
                          {ingredient.startsWith('-') ? ingredient : `- ${ingredient}`}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="collapsible-section">
                <button 
                  className={`collapse-button ${expandedSection === 'directions' ? 'active' : ''}`}
                  onClick={() => setExpandedSection(expandedSection === 'directions' ? '' : 'directions')}
                >
                  Directions ▼
                </button>
                <div className={`collapse-content ${expandedSection === 'directions' ? 'show' : 'hide'}`}>
                  {recipeInfo.recipe.split('\n').map((step, index) => (
                    <p key={index} className="content-line">{step}</p>
                  ))}
                  {recipeInfo.youtubeLink && (
                    <div className="youtube-link">
                      <p className="tutorial-text">YouTube Video Based Off Ingredients:</p>
                      <a 
                        href={recipeInfo.youtubeLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="tutorial-link"
                      >
                        Watch Recipe Based Off Ingredients
        </a>
      </div>
                  )}
                  <div className="recipe-counter">
                    Recipe version: {recipeCount}
                  </div>
                </div>
              </div>

              <div className="collapsible-section">
                <button 
                  className={`collapse-button ${expandedSection === 'nutrition' ? 'active' : ''}`}
                  onClick={() => setExpandedSection(expandedSection === 'nutrition' ? '' : 'nutrition')}
                >
                  Nutrition ▼
        </button>
                {expandedSection === 'nutrition' && (
                  <div className="collapse-content">
                    <p>{recipeInfo.nutritionalFacts}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div id="about-us" className="about-section">
          <h2>About Us</h2>
          <div className="about-grid">
            <div className="about-box">
              <h3>Our Mission</h3>
              <p>At Food Fixer, we're passionate about helping people transform everyday ingredients into delicious meals. Our platform combines innovative recipe generation with practical cooking solutions.</p>
            </div>
            <div className="about-box">
              <h3>What We Do</h3>
              <p>We provide smart recipe suggestions based on your available ingredients, complete with nutritional information and video tutorials. Our goal is to make cooking easier and more enjoyable for everyone.</p>
            </div>
            <div className="about-box">
              <h3>Our Vision</h3>
              <p>We envision a world where no ingredient goes to waste and where everyone can cook with confidence. Through our platform, we're making this vision a reality, one recipe at a time.</p>
            </div>
          </div>
        </div>

        <footer className="footer">
          <p>© 2023 Food Fixer. All rights reserved.</p>
        </footer>
      </div>
    </>
  )
}

export default App