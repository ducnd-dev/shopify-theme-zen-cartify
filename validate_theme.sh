#!/bin/bash

echo "==================================================="
echo "     ZenCartify Theme - Validation des fichiers     "
echo "==================================================="
echo ""

# Vérification des fichiers JSON
echo "Validation des fichiers JSON..."
for file in $(find . -name "*.json"); do
  echo -n "Vérification de $file: "
  if jq empty "$file" 2>/dev/null; then
    echo "OK"
  else
    echo "ERREUR - Format JSON invalide"
  fi
done

# Vérification des fichiers Liquid
echo -e "\nVérification des balises Liquid..."
for file in $(find . -name "*.liquid"); do
  echo -n "Vérification de $file: "
  
  # Vérifier les balises ouvrantes et fermantes
  open_tags=$(grep -o "{%" "$file" | wc -l)
  close_tags=$(grep -o "%}" "$file" | wc -l)
  
  if [ "$open_tags" -ne "$close_tags" ]; then
    echo "ERREUR - Balises {% %} non équilibrées ($open_tags ouvrantes vs $close_tags fermantes)"
  else
    # Vérifier si pas d'espaces manquants dans les balises
    bad_spacing=$(grep -E "{%[^ ]|[^ ]%}|{{[^ ]|[^ ]}}" "$file" | wc -l)
    
    if [ "$bad_spacing" -gt 0 ]; then
      echo "AVERTISSEMENT - Espacement incorrect dans les balises Liquid"
    else
      echo "OK"
    fi
  fi
done

# Vérification des fichiers CSS
echo -e "\nVérification des règles CSS..."
css_files=$(find . -name "*.css")
if [ -n "$css_files" ]; then
  for file in $css_files; do
    echo -n "Vérification de $file: "
    
    # Vérifier les accolades non fermées
    open_braces=$(grep -o "{" "$file" | wc -l)
    close_braces=$(grep -o "}" "$file" | wc -l)
    
    if [ "$open_braces" -ne "$close_braces" ]; then
      echo "ERREUR - Accolades non équilibrées ($open_braces ouvrantes vs $close_braces fermantes)"
    else
      echo "OK"
    fi
  done
fi

# Vérification des fichiers JavaScript
echo -e "\nVérification des fichiers JavaScript..."
js_files=$(find . -name "*.js")
if [ -n "$js_files" ]; then
  for file in $js_files; do
    echo -n "Vérification de $file: "
    
    # Vérifier la syntaxe avec node si disponible
    if command -v node &> /dev/null; then
      if node --check "$file" 2>/dev/null; then
        echo "OK"
      else
        echo "ERREUR - Syntaxe JavaScript invalide"
      fi
    else
      echo "AVERTISSEMENT - Node.js non disponible pour la vérification"
    fi
  done
fi

# Vérification des références aux fichiers d'assets
echo -e "\nVérification des références aux assets..."
for file in $(find . -name "*.liquid"); do
  references=$(grep -o "asset_url\|asset_img_url" "$file" | wc -l)
  if [ "$references" -gt 0 ]; then
    echo "Références aux assets trouvées dans $file"
    assets=$(grep -o "'[^']*' | asset_url" "$file" | sed "s/' | asset_url//g" | sed "s/'//g")
    for asset in $assets; do
      if [ ! -f "./assets/$asset" ]; then
        echo "  AVERTISSEMENT - Asset '$asset' référencé mais non trouvé dans le dossier assets/"
      fi
    done
  fi
done

echo -e "\nValidation terminée!"
