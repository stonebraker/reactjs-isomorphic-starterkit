var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var shared = require("./webpack.shared.js");

//La configuration Webpack côté serveur ne gérera que l'arbre de dépendance javascript
//Les arbres de dépendances des ressources (css, html, images...) seront gérés par la configuration client
//pour éviter une double gestion des ressources côté serveur et client.
//Cependant, Webpack se base sur l'arbre des requires pour injecter les liens dans le code javascript
//vers les bonnes ressources required. Il faut donc quand même gérer les ressources côté serveur.
//En output, on aura deux dossiers (client et serveur), le fichier js côté serveur se chargera
//via Express de loader les assets depuis le dossier client.
//Le template html serveur se charge de loader les ressources clients bundlées.
var loaders = [{
	test: /\.js[x]?$/,
	include: shared.APP_DIR,
	loader: "babel-loader",
	query: {
		presets: ["es2015", "react"]
	}
}, {
	test: /\.css$/,
	loader: ExtractTextPlugin.extract("style-loader", "css-loader?modules&localIdentName=[path]-[name]_[local]-[hash:base64:5]")
}, {
	test: /\.scss$/,
	loader: ExtractTextPlugin.extract("style-loader", "css-loader?modules&localIdentName=[path]-[name]_[local]-[hash:base64:5]!sass-loader")
}, {
	test: /\.(jp[e]?g|png|gif|svg)$/i,
	loader: "file-loader?name=img/[name].[ext]"
}, {
	test: /\.html$/,
	loader: "file-loader?name=[name].[ext]"
}, {
	test: /\.ico$/,
	loader: "file-loader?name=[name].[ext]"
}];

//Configuration Webpack pour générer un bundle qui sera utilisé par le serveur définit
//dans /bin/server/serverSideRendering.js:
var client = {
	name: "prod.client",
	//Par défaut, Webpack set l'environnement cible à "web":
	target: "web",
	/*entry: shared.APP_DIR + "/client",*/
	entry: {
		"client.bundle": shared.APP_DIR + "/client"
	},
	output: {
		filename: "[name].js",
		path: shared.CLIENT_BUILD_DIR,
		publicPath: "/"
	},
	module: {
		loaders: loaders
	},
	resolve: {
		extensions: ["", ".js", ".jsx"]
	},
	plugins: [
		//Prod optimizations:
		new webpack.optimize.DedupePlugin(),
		new webpack.optimize.OccurrenceOrderPlugin(),
		new webpack.optimize.UglifyJsPlugin({
			compress: {
				warnings: false
			}
		}),
		//Le plugin webpack d'optimisation DefinePlugin permet de définir des
		//variables accessible en global dans les js. Cela permet par exemple de définir l'environnement node
		//en production permettant ainsi de ne pas inclure par exemple les tests définie hors production dans react
		//réduisant ainsi la taille du bundle:
		new webpack.DefinePlugin({
			"process.env": {
				//JSON.stringify pour retourner "'production'":
				NODE_ENV: JSON.stringify("production")
			}
		}),

		//ExtractTextPlugin permet d'extraire le code css required dans
		//un fichier de telle manière qu'elle n'est plus inlined dans le js:
		new ExtractTextPlugin("[name].css")
	]
};

var server = {
	name: "prod.server",
	//target permet de spécifier le type de compilation réalisé suivant l"environnement de destination.
	//ici nous le settons à node car compilation pour un usage serveur (et donc node.js like environnement).
	//Cela permet d"alléger notre js de sortie en n"incluant pas les modules node.js natifs dans le
	//bundle (puisqu"on le lancera dans un environnement node.js).
	//Pour plus de détails: https://webpack.github.io/docs/configuration.html#target
	target: "node",
	//externals permet de spécifier les dépendances (modules) qui ne seront pas résolues par webpack (i.e. code source
	//non bundlé) mais qui doivent être résolues par le bundle de sortie
	//(i.e. on spécifie seulement des require dessus dans le bundle).
	externals: [
		//Dans notre cas, il est inutile de bundler les modules de node_modules (comme react, react-dom...) puisqu"on peut les
		//charger depuis notre environnement node.js. Des requires seuls dans le bundle sur ces derniers sont donc suffisants.
		//Pour ne pas les bundler (et obtenir par conséquent un bundle de sortie plus allégé), il suffit de les spécifier
		//en libraries externes via externals: tous les modules n"ayant pas
		//de chemin relatif (i.e. non commençant par ./) sont des modules node_modules et on les ajoute dans externals.
		//Une regexp permet de faire le tri:
		/^[a-z\-0-9]+$/, {
			//On considère react-dom/server comme externe (la regexp ne
			//fonctionne pas sur des chemins composés puisque webpack parse
			//le chemin en react-dom puis en /server => /server échappe à la règle):
			"react-dom/server": true
		}
	],
	entry: {
		//Key = nom du chunk. Si non spécifié comme sur le commentaire juste au-dessus
		//on devra spécifier sur chaque fichier de sortie, le nom du fichier à affecter
		//En spécifiant le nom chunk, on peut récupérer son nom via [name] et
		//l'affecter à chaque fichier de sortie en les ditinguant par leur extension:
		"server.bundle": shared.APP_DIR + "/server"
			//Possibilité de définir N entrées donc N sorties possibles
			//partageant la même configuration de bundling:
			//"test": APP_DIR + "/server"
	},
	output: {
		filename: "[name].js",
		path: shared.SERVER_BUILD_DIR,
		publicPath: "/",
		//output.libraryTarget permet de spécifier le type du bundle (commonjs ou AMD pour
		//un usage de notre librarie via tag script ou via require.js)
		//Pour plus de détails, cf. https://webpack.github.io/docs/library-and-externals.html
		//Nous utilisons ici commonjs puisque nous allons faire un require sur notre bundle libraires depuis
		///bin/server/server.js:
		//Différence commonjs et commonjs2:
		//commonjs mean pure CommonJs (i.e. exports enabled)
		//commonjs2 also includes the module.exports stuff.
		libraryTarget: "commonjs2"
	},
	module: {
		loaders: loaders
	},
	resolve: {
		extensions: ["", ".js", ".jsx"]
	},
	plugins: [
		//Prod optimizations:
		new webpack.optimize.DedupePlugin(),
		new webpack.optimize.OccurrenceOrderPlugin(),
		new webpack.optimize.UglifyJsPlugin({
			compress: {
				warnings: false
			}
		}),
		new webpack.DefinePlugin({
			"process.env": {
				NODE_ENV: JSON.stringify("production")
			}
		}),

		new ExtractTextPlugin("[name].css")
		//Plugin webpack permettant d'ignorer l'analyse des requires sur certaines extensions:
		//new webpack.IgnorePlugin(/\.(jp[e]?g|png|gif|svg|html|ico)$/)
	]
};

module.exports = [client, server];
