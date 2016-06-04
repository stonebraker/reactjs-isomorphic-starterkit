import React from "react";
import { renderToString } from "react-dom/server";
import { match, RouterContext } from "react-router";
//on peut ne pas spécifier l"extension jsx dans l"import car extension
//configurée par défaut dans les configs webpack:
import routes from "../shared/routes.jsx";

//renderHtml est une Closure (i.e. fonction non pure) car dépendant d'une variable
//extérieure (process.env.NODE_ENV qui est globale et fournie par Webpack et node):
function renderHTML(componentHTML) {
	//Suivant si on est en production ou non, on chargera les
	//assets différemment (pour permettre notamment le hot reload en dev):
	if(process.env.NODE_ENV === "production")
		//ES2015 template string:
		return `<!DOCTYPE html>
<html>

	<head>
		<meta charset="UTF-8">
		<title>React Isomorphic Starter Kit</title>
		<link rel="stylesheet" href="/client.bundle.css">
	</head>

	<body>
		<div id="app">${componentHTML}</div>

		<script src="/client.bundle.js"></script>
	</body>

</html>`;
	else
		return `<!DOCTYPE html>
<html>

	<head>
		<meta charset="UTF-8">
		<title>React Isomorphic Starter Kit</title>
	</head>

	<body>
		<div id="app">${componentHTML}</div>

		<script src="http://localhost:8081/client.bundle.js"></script>
	</body>

</html>`;
}

//Définition de la fonction middleware qui sera utilisé par express à chaque requête client/serveur:
//Elle permet de gérer les redirections en réponse via react-router
//Pour plus de détails: cf. https://github.com/reactjs/react-router/blob/master/docs/guides/ServerRendering.md :
export default function(req, res) {
	console.log(req.url);
	/*
	if(req.url.indexOf(".ico") !== -1)
		console.log("ICO file");
	*/
	match({ routes, location: req.url }, (error, redirectLocation, renderProps) => {
		if(error) {
			res.status(500).send(error.message);
		} else if(redirectLocation) {
			res.redirect(302, redirectLocation.pathname + redirectLocation.search);
		} else if(renderProps) {
			res.status(200).send(renderHTML(renderToString(<RouterContext {...renderProps} />)));
		} else {
			res.status(404).send("Not found");
		}
	});
}
