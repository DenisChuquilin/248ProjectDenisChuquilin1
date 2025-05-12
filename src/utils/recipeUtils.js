export const parseRecipeText = (generatedText) => {
  const recipeName = generatedText.match(/Recipe Name:([^\n]*)/)?.[1]?.trim() || '';
  const ingredientsMatch = generatedText.match(/Ingredients:([\s\S]*?)(?=Directions:|$)/);
  const directionsMatch = generatedText.match(/Directions:([\s\S]*?)(?=Nutrition Facts:|$)/);
  const nutritionMatch = generatedText.match(/Nutrition Facts:([\s\S]*?)$/);

  return {
    name: recipeName,
    ingredients: processIngredients(ingredientsMatch?.[1] || ''),
    directions: processDirections(directionsMatch?.[1] || ''),
    nutrition: processNutrition(nutritionMatch?.[1] || '')
  };
};

const processIngredients = (text) => {
  return text
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line !== '-' && !line.includes('Keep under 100 words'))
    .join('\n');
};

// Add similar processing functions for directions and nutrition 