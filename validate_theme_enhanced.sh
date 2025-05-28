#!/bin/bash

echo "==================================================="
echo "     ZenCartify Theme - Enhanced Validation Tool    "
echo "==================================================="
echo ""

# Définition des couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs pour le rapport final
ERROR_COUNT=0
WARNING_COUNT=0
SUCCESS_COUNT=0

# Vérification des fichiers JSON
echo -e "${BLUE}Validation des fichiers JSON...${NC}"
for file in $(find . -name "*.json" | sort); do
  echo -n "Vérification de $file: "
  if jq empty "$file" 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT+1))
  else
    echo -e "${RED}ERREUR - Format JSON invalide${NC}"
    ERROR_COUNT=$((ERROR_COUNT+1))
  fi
done

# Vérification approfondie des fichiers Liquid
echo -e "\n${BLUE}Vérification approfondie des fichiers Liquid...${NC}"
for file in $(find . -name "*.liquid" | sort); do
  echo -e "\n${BLUE}Analyse de $file:${NC}"
  
  # Vérifier les balises ouvrantes et fermantes
  open_tags=$(grep -o "{%" "$file" | wc -l)
  close_tags=$(grep -o "%}" "$file" | wc -l)
  
  if [ "$open_tags" -ne "$close_tags" ]; then
    echo -e "  ${RED}✗ Balises {% %} non équilibrées ($open_tags ouvrantes vs $close_tags fermantes)${NC}"
    ERROR_COUNT=$((ERROR_COUNT+1))
  else
    echo -e "  ${GREEN}✓ Balises {% %} équilibrées${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT+1))
  fi
  
  # Vérifier les balises d'output ouvrantes et fermantes
  open_output=$(grep -o "{{" "$file" | wc -l)
  close_output=$(grep -o "}}" "$file" | wc -l)
  
  if [ "$open_output" -ne "$close_output" ]; then
    echo -e "  ${RED}✗ Balises {{ }} non équilibrées ($open_output ouvrantes vs $close_output fermantes)${NC}"
    ERROR_COUNT=$((ERROR_COUNT+1))
  else
    echo -e "  ${GREEN}✓ Balises {{ }} équilibrées${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT+1))
  fi
  
  # Vérifier si pas d'espaces manquants dans les balises
  bad_spacing=$(grep -E "{%[^ ]|[^ ]%}|{{[^ ]|[^ ]}}" "$file")
  if [ -n "$bad_spacing" ]; then
    echo -e "  ${YELLOW}⚠ Espacement incorrect dans les balises Liquid:${NC}"
    echo "$bad_spacing" | head -5 | sed 's/^/    /'
    WARNING_COUNT=$((WARNING_COUNT+1))
  else
    echo -e "  ${GREEN}✓ Espacement correct dans les balises${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT+1))
  fi
  
  # Vérifier les apostrophes non échappées dans les chaînes default:
  unescaped_apostrophes=$(grep -E "default:\s*'[^']*'[^']*'" "$file")
  if [ -n "$unescaped_apostrophes" ]; then
    echo -e "  ${RED}✗ Apostrophes problématiques dans les valeurs par défaut:${NC}"
    echo "$unescaped_apostrophes" | head -5 | sed 's/^/    /'
    ERROR_COUNT=$((ERROR_COUNT+1))
  else
    echo -e "  ${GREEN}✓ Pas de problème d'apostrophe dans les valeurs par défaut${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT+1))
  fi
  
  # Vérifier les apostrophes mal échappées
  bad_escaping=$(grep -E "\\\\'|'\\\\'" "$file")
  if [ -n "$bad_escaping" ]; then
    echo -e "  ${RED}✗ Apostrophes mal échappées:${NC}"
    echo "$bad_escaping" | head -5 | sed 's/^/    /'
    ERROR_COUNT=$((ERROR_COUNT+1))
  else
    echo -e "  ${GREEN}✓ Pas d'apostrophes mal échappées${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT+1))
  fi
  
  # Vérifier les balises Liquid if/endif, for/endfor, etc.
  for tag_type in if unless for case form capture schema section; do
    open_type=$(grep -o "{%\s*$tag_type\s" "$file" | wc -l)
    close_type=$(grep -o "{%\s*end$tag_type\s" "$file" | wc -l)
    
    if [ "$open_type" -ne "$close_type" ]; then
      echo -e "  ${RED}✗ Balises $tag_type/end$tag_type non équilibrées ($open_type vs $close_type)${NC}"
      ERROR_COUNT=$((ERROR_COUNT+1))
    else
      echo -e "  ${GREEN}✓ Balises $tag_type/end$tag_type équilibrées${NC}"
      SUCCESS_COUNT=$((SUCCESS_COUNT+1))
    fi
  done
done

# Vérification des fichiers CSS
echo -e "\n${BLUE}Vérification des règles CSS...${NC}"
css_files=$(find . -name "*.css" | sort)
if [ -n "$css_files" ]; then
  for file in $css_files; do
    echo -e "\n${BLUE}Analyse de $file:${NC}"
    
    # Vérifier les accolades non fermées
    open_braces=$(grep -o "{" "$file" | wc -l)
    close_braces=$(grep -o "}" "$file" | wc -l)
    
    if [ "$open_braces" -ne "$close_braces" ]; then
      echo -e "  ${RED}✗ Accolades non équilibrées ($open_braces ouvrantes vs $close_braces fermantes)${NC}"
      ERROR_COUNT=$((ERROR_COUNT+1))
    else
      echo -e "  ${GREEN}✓ Accolades équilibrées${NC}"
      SUCCESS_COUNT=$((SUCCESS_COUNT+1))
    fi
    
    # Vérifier les !important
    important_count=$(grep -o "!important" "$file" | wc -l)
    if [ "$important_count" -gt 0 ]; then
      echo -e "  ${YELLOW}⚠ Utilisation de !important ($important_count instances)${NC}"
      WARNING_COUNT=$((WARNING_COUNT+1))
    else
      echo -e "  ${GREEN}✓ Pas d'utilisation de !important${NC}"
      SUCCESS_COUNT=$((SUCCESS_COUNT+1))
    fi
  done
fi

# Vérification des fichiers JavaScript
echo -e "\n${BLUE}Vérification des fichiers JavaScript...${NC}"
js_files=$(find . -name "*.js" | sort)
if [ -n "$js_files" ]; then
  for file in $js_files; do
    echo -e "\n${BLUE}Analyse de $file:${NC}"
    
    # Vérifier la syntaxe avec node si disponible
    if command -v node &> /dev/null; then
      if node --check "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✓ Syntaxe JavaScript valide${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT+1))
      else
        echo -e "  ${RED}✗ Syntaxe JavaScript invalide${NC}"
        node --check "$file" 2>&1 | head -5 | sed 's/^/    /'
        ERROR_COUNT=$((ERROR_COUNT+1))
      fi
    else
      echo -e "  ${YELLOW}⚠ Node.js non disponible pour la vérification${NC}"
      WARNING_COUNT=$((WARNING_COUNT+1))
    fi
    
    # Vérifier les console.log qui pourraient être oubliés
    console_logs=$(grep -o "console\.log" "$file" | wc -l)
    if [ "$console_logs" -gt 0 ]; then
      echo -e "  ${YELLOW}⚠ console.log trouvés ($console_logs instances)${NC}"
      grep -n "console\.log" "$file" | head -5 | sed 's/^/    /'
      WARNING_COUNT=$((WARNING_COUNT+1))
    else
      echo -e "  ${GREEN}✓ Pas de console.log${NC}"
      SUCCESS_COUNT=$((SUCCESS_COUNT+1))
    fi
  done
fi

# Vérification des références aux fichiers d'assets
echo -e "\n${BLUE}Vérification des références aux assets...${NC}"
all_assets=$(find ./assets -type f | sed 's|./assets/||')
asset_refs=()

for file in $(find . -name "*.liquid" | sort); do
  # Trouver toutes les références asset_url
  refs=$(grep -o "['\"][^'\"]*['\"][ ]*|[ ]*asset_url" "$file" | sed -E "s/['\"]([^'\"]*)['\"][ ]*\|[ ]*asset_url/\1/g")
  
  if [ -n "$refs" ]; then
    while read -r asset; do
      if [ -n "$asset" ]; then
        asset_refs+=("$asset:$file")
        # Vérifier si l'asset existe
        if [ ! -f "./assets/$asset" ]; then
          echo -e "  ${RED}✗ Asset '$asset' référencé dans $file mais non trouvé${NC}"
          ERROR_COUNT=$((ERROR_COUNT+1))
        else
          echo -e "  ${GREEN}✓ Asset '$asset' référencé dans $file existe${NC}"
          SUCCESS_COUNT=$((SUCCESS_COUNT+1))
        fi
      fi
    done <<< "$refs"
  fi
done

# Vérifier les assets non utilisés
echo -e "\n${BLUE}Vérification des assets non utilisés...${NC}"
for asset in $all_assets; do
  used=false
  for ref in "${asset_refs[@]}"; do
    if [[ "$ref" == "$asset:"* ]]; then
      used=true
      break
    fi
  done
  
  if [ "$used" = false ]; then
    echo -e "  ${YELLOW}⚠ Asset '$asset' existe mais n'est pas référencé${NC}"
    WARNING_COUNT=$((WARNING_COUNT+1))
  fi
done

# Vérification des clés de traduction
echo -e "\n${BLUE}Vérification des clés de traduction...${NC}"
translation_keys=()

if [ -d "./locales" ]; then
  # Extraire toutes les clés de traduction des fichiers de langue
  for locale_file in $(find ./locales -name "*.json" | sort); do
    keys=$(jq -r 'path(..|select(type=="string")) | join(".")' "$locale_file" | sort | uniq)
    while read -r key; do
      if [ -n "$key" ]; then
        translation_keys+=("$key")
      fi
    done <<< "$keys"
  done
  
  # Vérifier les clés de traduction utilisées dans les fichiers Liquid
  for file in $(find . -name "*.liquid" | sort); do
    t_refs=$(grep -o "['\"][^'\"]*['\"][ ]*|[ ]*t" "$file" | sed -E "s/['\"]([^'\"]*)['\"][ ]*\|[ ]*t/\1/g")
    
    if [ -n "$t_refs" ]; then
      while read -r key; do
        if [ -n "$key" ]; then
          found=false
          for t_key in "${translation_keys[@]}"; do
            if [ "$key" = "$t_key" ]; then
              found=true
              echo -e "  ${GREEN}✓ Clé de traduction '$key' dans $file existe${NC}"
              SUCCESS_COUNT=$((SUCCESS_COUNT+1))
              break
            fi
          done
          
          if [ "$found" = false ]; then
            echo -e "  ${RED}✗ Clé de traduction '$key' utilisée dans $file mais non définie${NC}"
            ERROR_COUNT=$((ERROR_COUNT+1))
          fi
        fi
      done <<< "$t_refs"
    fi
  done
else
  echo -e "  ${YELLOW}⚠ Dossier 'locales' non trouvé, impossible de vérifier les clés de traduction${NC}"
  WARNING_COUNT=$((WARNING_COUNT+1))
fi

# Rapport final
echo -e "\n${BLUE}==================================================${NC}"
echo -e "${BLUE}              Rapport de validation              ${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}✓ $SUCCESS_COUNT vérifications réussies${NC}"
echo -e "${YELLOW}⚠ $WARNING_COUNT avertissements${NC}"
echo -e "${RED}✗ $ERROR_COUNT erreurs${NC}"

if [ $ERROR_COUNT -gt 0 ]; then
  echo -e "\n${RED}La validation a échoué avec $ERROR_COUNT erreurs${NC}"
  exit 1
elif [ $WARNING_COUNT -gt 0 ]; then
  echo -e "\n${YELLOW}La validation a réussi avec $WARNING_COUNT avertissements${NC}"
  exit 0
else
  echo -e "\n${GREEN}La validation a réussi sans problème !${NC}"
  exit 0
fi
