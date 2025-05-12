import { useState } from 'react'
import { Label, Pie, PieChart, LineChart, XAxis, YAxis, CartesianGrid, Line } from "recharts"
import { GoogleGenerativeAI } from "@google/generative-ai"
import './App.css'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import About from './About'

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
  const [selectedAllergies, setSelectedAllergies] = useState([])
  const [customAllergy, setCustomAllergy] = useState('')
  const [showAllergyList, setShowAllergyList] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [recipeHistoryList, setRecipeHistoryList] = useState([])

  const commonAllergies = [
    'Peanuts',
    'Tree Nuts',
    'Milk',
    'Eggs',
    'Soy',
    'Wheat',
    'Fish',
    'Shellfish',
    'Sesame',
    'Gluten'
  ]

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

  const handleAllergySelect = (allergy) => {
    if (!selectedAllergies.includes(allergy)) {
      setSelectedAllergies([...selectedAllergies, allergy])
    }
  }

  const handleAllergyRemove = (allergy) => {
    setSelectedAllergies(selectedAllergies.filter(a => a !== allergy))
  }

  const handleCustomAllergyAdd = () => {
    if (customAllergy.trim() && !selectedAllergies.includes(customAllergy.trim())) {
      setSelectedAllergies([...selectedAllergies, customAllergy.trim()])
      setCustomAllergy('')
    }
  }

  const saveToHistory = (recipeData) => {
    const historyItem = {
      name: recipeData.name,
      ingredients: recipeData.ingredients,
      directions: recipeData.directions,
      nutrition: recipeData.nutrition,
      youtubeLink: recipeData.youtubeLink,
      timestamp: new Date().toISOString()
    }
    setRecipeHistoryList(prev => [historyItem, ...prev].slice(0, 10))
  }

  const loadFromHistory = (historyItem) => {
    // Set the recipe name
    setRecipe(historyItem.name);
    
    // Set all recipe info
    setRecipeInfo({
      ingredients: historyItem.ingredients,
      recipe: historyItem.directions,
      nutritionalFacts: historyItem.nutrition,
      youtubeLink: historyItem.youtubeLink
    });

    // Extract ingredients from the recipe and populate the input boxes
    const ingredientLines = historyItem.ingredients.split('\n')
      .filter(line => line.trim() && !line.includes('Keep under'))
      .map(line => line.replace(/^-\s*/, '').trim()); // Remove bullet points and trim

    // Create a new array with the extracted ingredients
    const newIngredients = [...ingredients];
    ingredientLines.forEach((ingredient, index) => {
      if (index < newIngredients.length) {
        newIngredients[index] = ingredient;
      }
    });
    setIngredients(newIngredients);

    // Expand all sections automatically
    setExpandedSection('all');
    
    // Close the history dropdown
    setShowHistory(false);
  };

  const toggleSection = (section) => {
    if (expandedSection === 'all') {
      setExpandedSection(section);
    } else {
      setExpandedSection(expandedSection === section ? '' : section);
    }
  };

  const generateRecipe = async (ingredientsToUse = ingredients, isAlternative = false) => {
    setLoading(true);
    setRecipeInfo({
      ingredients: '',
      recipe: '',
      nutritionalFacts: '',
      youtubeLink: ''
    });
    
    try {
      setLastUsedIngredients(ingredientsToUse.filter(ing => ing.trim() !== ''));
      
      const API_KEY = 'AIzaSyA9_sTDUIGb8lSVBqshRFFfgLm_nkMJ9sE';
      
      const allergyWarning = selectedAllergies.length > 0 
        ? `IMPORTANT: This recipe MUST NOT contain any of these allergens: ${selectedAllergies.join(', ')}.`
        : '';

      const prompt = isAlternative 
        ? `Create a brief, healthy recipe using these ingredients: ${ingredientsToUse.join(', ')}.
           Must be different from: ${recipeHistory.join(', ')}.
           
           ${allergyWarning}
           
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
           
           ${allergyWarning}
           
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
        console.log('Full generated text:', generatedText);
        
        const recipeName = generatedText.match(/Recipe Name:([^\n]*)/)?.[1]?.trim() || 'Unnamed Recipe';
        
        // Extract ingredients section
        const wordCount = (text) => text.trim().split(/\s+/).length;
        const ingredientsMatch = generatedText.match(/Ingredients:([\s\S]*?)(?=Directions:|$)/);
        let ingredientSection = '';
        if (ingredientsMatch) {
          const ingredientLines = ingredientsMatch[1]
            .trim()
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && line !== '-' && !line.includes('Keep under'));

          ingredientSection = ingredientLines.join('\n');
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

        // Search for YouTube video
        let youtubeLink = '';
        try {
          youtubeLink = await searchYouTubeVideo(recipeName);
          console.log('Setting new YouTube link:', youtubeLink);
        } catch (error) {
          console.error('Error fetching YouTube video:', error);
          youtubeLink = '';
        }

        // Update recipe info
        const newRecipeInfo = {
          ingredients: ingredientSection,
          recipe: directionsSection,
          nutritionalFacts: nutritionSection,
          youtubeLink: youtubeLink || ''
        };

        setRecipeInfo(newRecipeInfo);
        setRecipe(recipeName);
        setRecipeCount(prev => prev + 1);

        // Save to history with the actual recipe name
        saveToHistory({
          name: recipeName,
          ingredients: ingredientSection,
          directions: directionsSection,
          nutrition: nutritionSection,
          youtubeLink: youtubeLink || ''
        });

      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error details:', error);
      setRecipe('Error generating recipe. Please try again. Error: ' + error.message);
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

  return (
    <Router>
      <Routes>
        <Route path="/about" element={<About />} />
        <Route path="/" element={
          <>
            <div className="header-bar">
              <div className="header-left">
                <img src="/logo.png" alt="Food Fixer Logo" className="header-logo" />
                <span className="header-text">Food Fixer</span>
                <nav className="nav-links">
                  <button 
                    onClick={() => {
                      setShowAllergyList(!showAllergyList);
                      setShowHistory(false); // Close history when opening allergies
                    }} 
                    className="nav-link"
                  >
                    Allergies
                  </button>
                  <button 
                    onClick={() => {
                      setShowHistory(!showHistory);
                      setShowAllergyList(false); // Close allergies when opening history
                    }} 
                    className="nav-link"
                  >
                    History
                  </button>
                  <Link to="/about" className="nav-link">About Us</Link>
                </nav>
              </div>
            </div>

            {showAllergyList && (
              <div className="header-dropdown allergies-dropdown">
                <div className="allergies-container">
                  <div className="common-allergies">
                    {commonAllergies.map((allergy) => (
                      <button
                        key={allergy}
                        className={`allergy-button ${selectedAllergies.includes(allergy) ? 'selected' : ''}`}
                        onClick={() => handleAllergySelect(allergy)}
                      >
                        {allergy}
                      </button>
                    ))}
                  </div>

                  <div className="custom-allergy">
                    <input
                      type="text"
                      value={customAllergy}
                      onChange={(e) => setCustomAllergy(e.target.value)}
                      placeholder="Add custom allergy"
                      className="custom-allergy-input"
                    />
                    <button 
                      onClick={handleCustomAllergyAdd}
                      className="add-allergy-button"
                    >
                      Add
                    </button>
                  </div>

                  {selectedAllergies.length > 0 && (
                    <div className="selected-allergies">
                      <h4>Selected Allergies:</h4>
                      <div className="allergy-tags">
                        {selectedAllergies.map((allergy) => (
                          <span key={allergy} className="allergy-tag">
                            {allergy}
                            <button
                              onClick={() => handleAllergyRemove(allergy)}
                              className="remove-allergy"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showHistory && (
              <div className="header-dropdown history-dropdown">
                <div className="history-container">
                  <h3>Recent Recipes</h3>
                  {recipeHistoryList.length > 0 ? (
                    <div className="history-list">
                      {recipeHistoryList.map((item, index) => (
                        <div 
                          key={index} 
                          className="history-item"
                          onClick={() => loadFromHistory(item)}
                        >
                          <div className="history-item-content">
                            <span className="history-name">{item.name}</span>
                            <span className="history-date">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-history">No recipes in history</p>
                  )}
                </div>
              </div>
            )}

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
                        className={`collapse-button ${expandedSection === 'ingredients' || expandedSection === 'all' ? 'active' : ''}`}
                        onClick={() => toggleSection('ingredients')}
                      >
                        Ingredients ▼
                      </button>
                      {(expandedSection === 'ingredients' || expandedSection === 'all') && (
                        <div className="collapse-content">
                          {recipeInfo.ingredients.split('\n').map((ingredient, index) => {
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
                        className={`collapse-button ${expandedSection === 'directions' || expandedSection === 'all' ? 'active' : ''}`}
                        onClick={() => toggleSection('directions')}
                      >
                        Directions ▼
                      </button>
                      {(expandedSection === 'directions' || expandedSection === 'all') && (
                        <div className="collapse-content">
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
                        </div>
                      )}
                    </div>

                    <div className="collapsible-section">
                      <button 
                        className={`collapse-button ${expandedSection === 'nutrition' || expandedSection === 'all' ? 'active' : ''}`}
                        onClick={() => toggleSection('nutrition')}
                      >
                        Nutrition ▼
        </button>
                      {(expandedSection === 'nutrition' || expandedSection === 'all') && (
                        <div className="collapse-content">
                          <p>{recipeInfo.nutritionalFacts}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <footer className="footer">
                <p>© 2023 Food Fixer. All rights reserved.</p>
              </footer>
      </div>
    </>
        } />
      </Routes>
    </Router>
  )
}

export default App