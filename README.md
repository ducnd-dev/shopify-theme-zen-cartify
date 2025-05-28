# Guide de développement du thème ZenCartify

Ce guide vous explique comment configurer et tester votre thème Shopify ZenCartify en local, et comment le déployer sur votre boutique Shopify.

## Méthodes de test local

Il existe plusieurs façons de tester votre thème ZenCartify en local:

### 1. Visualisation simple avec le fichier demo.html

Pour un aperçu rapide des composants et du style de votre thème sans serveur Shopify:

1. Ouvrez le fichier `demo.html` dans votre navigateur
2. Ce fichier démontre les principaux composants de votre thème et leur apparence

Cette méthode est idéale pour tester rapidement les styles CSS et les interactions JavaScript de base.

### 2. Utilisation de Shopify CLI (recommandé)

Pour un développement complet avec synchronisation en temps réel:

#### Installation de Shopify CLI

```bash
# Installer Node.js si ce n'est pas déjà fait
# Téléchargez et installez depuis https://nodejs.org/

# Installer Shopify CLI
npm install -g @shopify/cli @shopify/theme

# Vérifier l'installation
shopify version
```

#### Connexion et développement

```bash
# Se connecter à votre compte Shopify
shopify login

shopify theme dev --store=votre-boutique.myshopify.com
```

Cela lancera un serveur local (généralement sur http://localhost:9292) qui synchronisera automatiquement toutes vos modifications avec votre boutique Shopify.

### 3. Utilisation de Theme Kit (alternative)

Theme Kit est un outil plus léger pour le développement de thèmes Shopify:

#### Installation de Theme Kit

1. Téléchargez Theme Kit depuis [https://shopify.github.io/themekit/](https://shopify.github.io/themekit/)
2. Ajoutez-le à votre PATH système

#### Configuration et utilisation

Un fichier `config.yml` est déjà créé dans votre projet. Mettez à jour les valeurs:

1. Créez un Private App dans votre admin Shopify:
   - Admin Shopify > Apps > Développer des apps
   - Nouvelle app et donnez les accès "Read and write" aux thèmes
   - Copiez le mot de passe API

2. Mettez à jour votre fichier `config.yml`:
   - Remplacez `shpat_XXXX_VOTRE_MOT_DE_PASSE_API_ICI` par votre mot de passe API réel
   - Remplacez `votre-boutique.myshopify.com` par le nom de votre boutique

3. Utilisation des commandes Theme Kit:
```bash
# Télécharger la version live de votre thème
theme get --config=config.yml

# Observer les modifications et les envoyer automatiquement
theme watch

# Téléverser tous les fichiers
theme deploy
```

## Création d'un package de thème pour installation

Pour créer un fichier ZIP de votre thème à téléverser directement dans Shopify:

```bash
# Sur Windows avec PowerShell
Compress-Archive -Path 'c:\Users\DucND\Desktop\project\shopify-theme-zen-cartify\*' -DestinationPath 'c:\Users\DucND\Desktop\zencartify-theme.zip'

# Avec 7-Zip
# Clic droit sur le dossier > 7-Zip > Ajouter à l'archive...
```

Puis dans votre admin Shopify:

1. Allez à Boutique en ligne > Thèmes
2. Cliquez sur "Ajouter un thème" > "Téléverser un fichier ZIP"
3. Sélectionnez votre fichier ZIP
4. Une fois téléchargé, vous pouvez prévisualiser ou publier le thème

## Structure des fichiers du thème

```
zencartify-theme/
├── assets/ - Fichiers CSS, JS, images et autres actifs
│   ├── theme.css - Styles principaux avec BEM
│   └── theme.js - JavaScript modulaire avec ES6+
├── config/ - Fichiers de configuration
│   └── settings_schema.json - Paramètres du thème
├── layout/ - Mises en page principales
│   └── theme.liquid - Structure HTML de base
├── sections/ - Sections réutilisables
├── snippets/ - Fragments réutilisables
├── templates/ - Pages du thème
│   ├── customers/ - Pages du compte client
│   ├── index.liquid - Page d'accueil
│   ├── collection.liquid - Page de collection
│   └── product.liquid - Page de produit
└── config.yml - Configuration du Theme Kit
```

## Ressources utiles

- [Documentation Shopify pour les développeurs de thèmes](https://shopify.dev/docs/themes)
- [Documentation de Shopify CLI](https://shopify.dev/docs/themes/tools/cli)
- [Documentation de Theme Kit](https://shopify.github.io/themekit/)
- [Documentation Liquid](https://shopify.dev/docs/api/liquid)
- [Documentation Tailwind CSS](https://tailwindcss.com/docs)
