const client = new ChimeWebSDK();
const chatApi = client.chat;
const contactApi = client.contact;
const authApi = client.auth;

let conversationId;
const nameMap = {};
let currentProfile = {};

function start() {
    // Always check if the user is authenticated on page load to
    // to detemine what to render
    authApi.checkIsAuthenticated()
        .then(function(isAuthenticated) {
            if (isAuthenticated) {
                authApi.getCurrentUserProfile()
                    .then(function(profile) {
                        currentProfile = profile;
                        showAuthPage();
                    })
            } else {
                showUnauthPage()
            }
        });

    // Render proper contents on auth change from other tabs
    authApi.onAuthStatus(function(isAuthenticated) {
        if (isAuthenticated) {
            showAuthPage();
        } else {
            showUnauthPage();
        }
    })

    $("#auth-button").click(login);
    $("#unauth-button").click(function() {
        authApi.signOut();
    });
};

function login() {
	authApi.checkIsAuthenticated().then(function(isAuthenticated) {
		if(!isAuthenticated) {
			authApi.authenticate();
		}
		else {
			showAuthPage();
		}
	});
}

// Append message to chat message wall
function appendMessage(content, senderId) {
    if (!content) return;
    const senderName = nameMap[senderId];
    $("#chat-messages").append('<li class="list-group-item">' + '<b>' + senderName + '</b>' + ': ' + content + '</li>');
	$("#chat-messages").append(msgItem);
	$("#message-list").scrollTop($("#message-list")[0].scrollHeight);
}

// Append image to chat message wall
function appendImage(url) {
    $("#chat-messages").append('<li class="list-group-item"><img src="' + url + '" alt="image"></li>');
}

function appendError(target, error) {
    target.append('<div class="alert alert-danger">' + error + '</div>');
}

function renderItem(ref) {
    $(ref).removeClass("hidden");
}

function hideItem(ref) {
    $(ref).addClass("hidden");
}

// Hide other views and render login view
function handleLoginTabClick() {
    hideItem(".view");
    renderItem("#login-view");
}

// Hide other views and render login view
function handleSignoutTabClick() {
    hideItem(".view");
    renderItem("#signout-view");
}

// Hide other views and render contact view
function handleContactTabClick() {
    hideItem(".view");
    renderItem("#contact-view");
}

// 1. list conversation messages and append to page content
// 2. register onConversationMessage callback to receive new messages and append them to the view
// 3. Hide other views and render chat view
function handleChatTabClick() {
    chatApi.listConversationMessages(conversationId)
        .then(function(res) {
            $("#chat-messages").empty();
            for (let i = res.result.length - 1; i >= 0 ; i--) {
                const content = res.result[i].content;
                if (content) {
                    appendMessage(content, res.result[i].sender);
                }
                
                const url = res.result[i].attachmentVariants && res.result[i].attachmentVariants[0].url;
                if (url) {
                    appendImage(url)
                }
            }
        });
    chatApi.onConversationMessage(conversationId, function(event) {
        const content = event.data.record.content;
        if (content) {
            appendMessage(content, event.data.record.sender);
        } 
    });
    hideItem(".view");
    renderItem("#chat-view");
}

// Add contact and create conversation, and save conversation id
// to global variable conversationId
function handleAddContact() {
    const email = $("#add-contact-email").val();
    contactApi.addContact(email)
        .then(function(res) {
            chatApi.createConversation([res.profileId])
                .then(function(res) {
                    conversationId = res.id;
                    const members = res.members;
                    for (const member of members) {
                        nameMap[member.id] = member.name;
                    } 
                    const chatName = members[0].id === currentProfile.profileId ? members[1].name : members[0].name;
                    $('#chat-name').empty();
                    $('#chat-name').append('Chat with: ' + chatName);
                    renderItem("#chat-tab");
                })
                .catch(function(error) {
                    appendError($('#contact-error'), error);
                })
        });
}

function handleSendMessage() {
    const message = $("#message-input").val();
    if (message.trim()) {
		if(message.trim().startsWith('$')) {
			const issueKey = message.substring(1).trim();
			sendIssue(issueKey);
		}
		else {
			chatApi.createConversationMessage(conversationId, message.trim())
				.then(function(res) {
					$("#message-input").val('');
				});
		}
    }
}

// Render a page that is authenticated
function showAuthPage() {
    renderItem(".auth-item");
    hideItem(".unauth-item");
    hideItem(".view");
}

// Render a page that is unauthenticated
function showUnauthPage() {
    renderItem(".unauth-item");
    hideItem(".auth-item");
    hideItem(".view");
    hideItem("#chat-tab");
}

function sendIssue(issueKey) {
	var searchJql = 'issueKey = ' + issueKey;
	console.log(searchJql);
	AP.require('request', function(request) {
		request({
			url: '/rest/api/latest/search?jql=' + encodeURIComponent(searchJql),
			success: async function(response) {
				// convert the string response to JSON
				response = JSON.parse(response);
				var responseText = JSON.stringify(response);
				console.log(responseText);
				var issue = response.issues[0];
				var issueMsg = '[' + issue.key + ']' + issue.fields.summary + ': ';
				issueMsg+= issue.fields.description? issue.fields.description : '';
				issueMsg+= ' (reporter: ' + issue.fields.reporter.displayName + ', assignee: ' + issue.fields.assignee? issue.fields.assignee.displayName : 'unassigned' + ')'; 
				chatApi.createConversationMessage(conversationId, issueMsg)
					.then(function(res) {
						$("#message-input").val('');
					});
			},
			error: function() {
				console.log(arguments);
			}    
		});
	});
}

start();