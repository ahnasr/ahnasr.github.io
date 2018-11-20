const client = new ChimeWebSDK();
var currentUser;
var contacts = {};
var currentConversation;

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
	client.auth.signOut();
}

function setLoginStatus(isAuthenticated) {
	document.getElementById("login-link").style.display = (isAuthenticated)?"none" : "block";
	document.getElementById("logout-link").style.display = (isAuthenticated)?"block" : "none";
	document.getElementById("loading-div").style.display = "none";
	document.getElementById("main-tab").style.display = "block";
	
	if(isAuthenticated) {
		client.auth.getCurrentUserProfile().then(setCurrentUser); 
	}
	else {
		document.getElementById("currentUser").innerHTML = "";
		document.getElementById("sideBar").innerHTML = "";
		document.getElementById("chatBox").innerHTML = "";
		currentUser = null;
		currentConversation = null;
		contacts = {};
	}
}

function setCurrentUser(profile) {
	currentUser = profile;
	document.getElementById("currentUser").innerHTML = currentUser.name;
	//getIssue();
	addContact("liyuchun@amazon.com");
	addContact("slemahm@amazon.com");
}

function addContact(email) {
	client.contact.addContact(email).then(function(profile) {
		contacts[profile.profileId] = profile;
		addToContactsBar(profile);
	});
}

function addToContactsBar(profile) {
	var contactDiv = document.createElement("div");
	contactDiv.innerHTML = profile.name;
	contactDiv.classList.add("contact");
	contactDiv.onclick = function() {
		var contactDivs = document.getElementsByClassName("contact");
		for(var i = 0; i < contactDivs.length; i++)
			contactDivs.item(i).style.borderStyle = "none";
			//contactDivs.item(i).style.backgroundColor = "transparent";
		//contactDiv.style.backgroundColor = "yellow";	
		contactDiv.style.borderStyle = "solid";
		//contactDiv.style.borderColor = "white";
		createConversation(profile.profileId);
	}
	
	var contactsBar = document.getElementById("sideBar");
	//var br = document.createElement("br");
	contactsBar.appendChild(contactDiv);
	//contactsBar.appendChild(br);
}

function createConversation(profileId) {
	var profileIds = new Array();
	profileIds[0] = profileId;
	client.chat.createConversation(profileIds).then(function(conversation) {
		currentConversation = conversation;
		listConversationMsg();
		subscribeToConversationMessages();
	});
}

function listConversationMsg() {
	document.getElementById("chatBox").innerHTML = "";
	client.chat.listConversationMessages(currentConversation.id, { maxResults:5 }).then(function(messages) {
		for(var i = messages.result.length - 1; i >= 0; i--) {
			addMsgToChat(messages.result[i]);
		}
	});
}

function subscribeToConversationMessages() {
	client.chat.onConversationMessage(currentConversation.id, function(result) {
		var message = result.data.record;
		if(message.conversationId == currentConversation.id) {
			addMsgToChat(message);
		}
	});
}

function createConversationMsg(event) {
	if(event.keyCode == 13) {
		var msg = document.getElementById("msg-text").value;
		client.chat.createConversationMessage(currentConversation.id, msg).then(function (result) {
			document.getElementById("msg-text").value = "";
		});
	}
}
		
function addMsgToChat(msg) {
	var msgDiv = document.createElement("div");
	var br = document.createElement("br");
	if(msg.sender == currentUser.profileId) {
		msgDiv.classList.add("darker");
		msgDiv.innerHTML = "<strong>" + currentUser.name + ":</strong><br />";
	}
	else {
		msgDiv.innerHTML = "<strong>" + contacts[msg.sender].name + ":</strong><br />";
	}
	msgDiv.innerHTML+= msg.content;
	msgDiv.classList.add("container");

	var chatDiv = document.getElementById("chatBox");
	chatDiv.appendChild(msgDiv);
	chatDiv.scrollTop = chatDiv.scrollHeight;
}
		
function getIssue() {
	var urlParams = new URLSearchParams(window.location.search);
	var searchJql = 'issueKey = ' + urlParams.get("issue_key");
	AP.require('request', function(request) {
		request({
			url: '/rest/api/latest/search?jql=' + encodeURIComponent(searchJql),
			success: function(response) {
				// convert the string response to JSON
				response = JSON.parse(response);
				var responseText = JSON.stringify(response);
				var reporterEmail = response.issues[0].fields.reporter.emailAddress;
				var assigneeEmail = response.issues[0].fields.assignee.emailAddress;
				if(reporterEmail != currentUser.primaryEmail)
					addContact(reporterEmail);
				if(assigneeEmail != currentUser.primaryEmail)
					addContact(assigneeEmail);
			},
			error: function() {
				console.log(arguments);
			}    
		});
	});
}
