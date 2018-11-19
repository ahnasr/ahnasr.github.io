const client = new ChimeWebSDK();
var currentUser;

window.addEventListener('load', function() {
	setTimeout(init, 500);
});

function init() {
	client.auth.checkIsAuthenticated().then(setLoginStatus);
	client.auth.onAuthStatus(setLoginStatus);
}

function login() {
	client.auth.authenticate();
}

function logout() {
	client.auth.signout();
}

function setLoginStatus(isAuthenticated) {
	document.getElementById("login-link").style.display = (isAuthenticated)?"none" : "block";
	document.getElementById("logout-link").style.display = (isAuthenticated)?"block" : "none";
	document.getElementById("loading-div").style.display = "none";
	document.getElementById("main-tab").style.display = "block";
	
	console.log("Authentication: " + isAuthenticated);
	
	if(isAuthenticated)
		client.auth.getCurrentUserProfile().then(setCurrentUser); 
	else
		document.getElementById("currentUser").innerHTML = "";
}

function setCurrentUser(profile) {
	currentUser = profile;
	currentUser.innerHTML = currentUser.name;
}
