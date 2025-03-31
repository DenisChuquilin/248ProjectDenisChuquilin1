import { useState } from 'react'
import { Label, Pie, PieChart, LineChart, XAxis, YAxis, CartesianGrid, Line } from "recharts"
import { GoogleGenerativeAI } from "@google/generative-ai"
import './App.css'

function App() {
  const [ingredients, setIngredients] = useState(['', '', ''])
  const [recipe, setRecipe] = useState('')
  const [loading, setLoading] = useState(false)
  const [calorieGoal, setCalorieGoal] = useState('')
  const [caloriesConsumed, setCaloriesConsumed] = useState('')
  const [lastUsedIngredients, setLastUsedIngredients] = useState([]);
  const [recipeCount, setRecipeCount] = useState(0);
  const [recipeInfo, setRecipeInfo] = useState({
    ingredients: '',
    recipe: '',
    nutritionalFacts: ''
  });
  const [expandedSection, setExpandedSection] = useState('');
  const [recipeHistory, setRecipeHistory] = useState([]);

  // Updated chart data for calorie tracking
  const calorieChartData = [
    { 
      name: "Consumed", 
      value: caloriesConsumed === '' ? 0 : caloriesConsumed, 
      fill: "#4CAF50"
    },
    { 
      name: "Remaining", 
      value: calorieGoal === '' || caloriesConsumed === '' ? 0 : 
             Math.max(calorieGoal - caloriesConsumed, 0), 
      fill: "#ff4444"
    }
  ]

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = value
    setIngredients(newIngredients)
    // Clear recipe history when ingredients change
    setRecipeHistory([]);
  }

  const generateRecipe = async (ingredientsToUse = ingredients, isAlternative = false) => {
    setLoading(true);
    try {
      setLastUsedIngredients(ingredientsToUse.filter(ing => ing.trim() !== ''));
      
      const API_KEY = 'AIzaSyDUh5nZYD1ItsgUH4p23kPe4igDloqKZdo';
      const prompt = isAlternative 
        ? `Create a UNIQUE HEALTHY recipe (version ${recipeCount + 1}) using: ${ingredientsToUse.join(', ')}. 
           Must be different from: ${recipeHistory.join(', ')}.
           Use healthy methods (bake/grill/steam). Keep it simple and concise.
           Format:
           Recipe Name: (short name)
           
           Ingredients:
           - Brief list with amounts
           
           Directions:
           1. Keep steps short and clear (max 4 steps)

           Nutrition Facts:
           Calories: [number] kcal
           Protein: [number]g
           Carbs: [number]g
           Fat: [number]g
           Fiber: [number]g`
        : `Create a brief, healthy recipe using: ${ingredientsToUse.join(', ')}.
           Use healthy methods (bake/grill/steam). Keep it simple and concise.
           Format:
           Recipe Name: (short name)
           
           Ingredients:
           - Brief list with amounts
           
           Directions:
           1. Keep steps short and clear (max 4 steps)

           Nutrition Facts:
           Calories: [number] kcal
           Protein: [number]g
           Carbs: [number]g
           Fat: [number]g
           Fiber: [number]g`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`, {
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
        const sections = generatedText.split('\n\n');
        
        const recipeName = sections[0].replace('Recipe Name:', '').trim();
        
        // Check if this recipe name has been used before
        if (isAlternative && recipeHistory.includes(recipeName)) {
          throw new Error('Recipe too similar to previous versions. Please try again.');
        }

        // Add the new recipe name to history
        setRecipeHistory(prev => [...prev, recipeName]);
        
        const ingredientSection = sections.find(s => s.startsWith('Ingredients:'))
          ?.replace('Ingredients:', '')
          .trim()
          .split('\n')
          .map(ing => ing.trim())
          .filter(ing => ing)
          .join('\n');

        const directionsSection = sections.find(s => s.startsWith('Directions:'))
          ?.replace('Directions:', '')
          .trim()
          .split('\n')
          .map(step => step.trim())
          .filter(step => step)
          .join('\n');

        // Updated nutrition facts parsing with default values
        let nutritionSection = sections.find(s => s.startsWith('Nutrition Facts'))
          ?.split('\n')
          .slice(1)
          .map(fact => fact.trim())
          .filter(fact => fact)
          .join('\n');

        // If nutrition facts are missing, provide estimated values
        if (!nutritionSection) {
          nutritionSection = `Calories: ~300 kcal
Protein: ~10 g
Carbs: ~40 g
Fat: ~15 g
Fiber: ~5 g`;
        }

        setRecipe(recipeName);
        setRecipeCount(prev => prev + 1);
        
        setRecipeInfo({
          ingredients: ingredientSection,
          recipe: directionsSection,
          nutritionalFacts: nutritionSection
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
        nutritionalFacts: ''
      });
    }
    setLoading(false);
  };

  const handleCalorieInput = (e) => {
    // Allow empty value for calories consumed
    const value = e.target.value === '' ? '' : Math.max(0, Number(e.target.value))
    // Only check max value if both values are numbers
    if (value !== '' && calorieGoal !== '' && value > calorieGoal) {
      setCaloriesConsumed(calorieGoal)
    } else {
      setCaloriesConsumed(value)
    }
  }

  const handleCalorieGoalInput = (e) => {
    // Allow empty value
    const value = e.target.value === '' ? '' : Math.max(0, Number(e.target.value))
    setCalorieGoal(value)
  }

  const generateAlternativeRecipe = () => {
    if (ingredients.filter(ing => ing.trim()).length >= 3) {
      // Add the current recipe version to make the prompt unique
      const currentVersion = recipeCount + 1;
      const prompt = `Version ${currentVersion}: Create a UNIQUE recipe different from: ${recipeHistory.join(', ')}`;
      generateRecipe(ingredients, true);
    }
  };

  return (
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
              <div className="ingredient-item">
                <span className="ingredient-icon">🥕</span>
                <span>Carrot</span>
              </div>
              <div className="ingredient-item">
                <span className="ingredient-icon">🍎</span>
                <span>Apple</span>
              </div>
              <div className="ingredient-item">
                <span className="ingredient-icon">🥚</span>
                <span>Egg</span>
              </div>
            </div>
          </div>
        </div>

        <div className="right-section">
          <h3>Calorie Tracker</h3>
          <div className="calorie-chart">
            <LineChart width={600} height={300}>
              <XAxis dataKey="name" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Line type="monotone" dataKey="calories" stroke="#4CAF50" />
            </LineChart>
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
                  {recipeInfo.ingredients.split('\n').map((ingredient, index) => (
                    <p key={index} className="content-line">{ingredient}</p>
                  ))}
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

      <footer>
        <p>© 2023 Food Fixer. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App