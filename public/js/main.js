// main.js
// author: Jason Lai

const roomNum = document.getElementById('roomDropDown');
const roomHeader = document.getElementById('roomHeader');
const chatBox = document.getElementById('chatBox');
const beginChatBtn = document.getElementById('beginChatBtn');
const adminChatBox1 = document.getElementById('adminChatBox1');
const adminChatBox2 = document.getElementById('adminChatBox2');
let chat;

function grabChats(){
	// grab chat messages from different chat rooms
  $.ajax({
      type: 'GET',
      url: `files/${$.cookie('room')}.txt?nocache=` + Math.random(),
      success: function(data){
				chatBox.value = data;

				// chat area would auto scroll to the bottom if
				// user is not hovering over the chat area
        if(chatBox.matches(':hover') === false){
					chatBox.scrollTop = chatBox.scrollHeight;
        }

				chat = setTimeout(grabChats, 1000);
      },
      error: function(){
        console.log("something went wrong!");
      }
    });
}

// show chat room 1 messages in admin panel
function grabChatsOne(){
  $.ajax({
      type: 'GET',
      url: `files/room1.txt?nocache=` + Math.random(),
      success: function(data){
				adminChatBox1.value = data;
				setTimeout(grabChatsOne, 1000);
      },
      error: function(){
        console.log("something went wrong!");
      }
    });
}

// show chat room 2 messages in admin panel
function grabChatsTwo(){
  $.ajax({
      type: 'GET',
      url: `files/room2.txt?nocache=` + Math.random(),
      success: function(data){
				adminChatBox2.value = data;
				setTimeout(grabChatsTwo, 1000);
      },
      error: function(){
        console.log("something went wrong!");
      }
    });
}

function setUpRoomHeader(){
	const room = $.cookie('room');

	if(room === 'room1'){
		roomHeader.textContent = "Welcome to Chat Room 1!";
	}
	else{
		roomHeader.textContent = "Welcome to Chat Room 2!";
	}
}

function deleteCookie(){
	document.cookie = 'room' + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

// get path snippet referenced from
// https://stackoverflow.com/questions/3151436/how-can-i-get-the-current-directory-name-in-javascript/36420350
if(window.location.pathname === '/go'){
	// start chatting button should not be displayed if user is
	// already on the chat room page
	beginChatBtn.style.display = 'none';

	// set up room cookie if not done so
	if($.cookie('room') === undefined){
		document.cookie = 'room=room1';
		setUpRoomHeader();
		clearTimeout(chat);
		grabChats();
	}
	else{
		setUpRoomHeader();
		clearTimeout(chat);
		grabChats();
	}

	// enable user to switch between different chat rooms
	// chat room header would also change accordingly
	roomNum.onchange = function(event){
		clearTimeout(chat);
		const newRoom = event.currentTarget.value;

		// update new room
		document.cookie = `room=${newRoom}`;

		// update room header
		setUpRoomHeader();

		grabChats();
	};
}
else if(window.location.pathname === '/adminPanel'){
	beginChatBtn.style.display = 'none';
	clearTimeout(chat);

	// delete room cookie if user went from /go to any other pages
	deleteCookie();
	grabChatsOne();
	grabChatsTwo();
}
// same for user login, admin, user register, and admin panel,
// start chatting button should not appear
else if(window.location.pathname === '/admin' || 
	window.location.pathname === '/login' || window.location.pathname === '/register'){
	beginChatBtn.style.display = 'none';
	clearTimeout(chat);
	deleteCookie();
}
// user on homepage, start chatting button should be displayed
else{
	clearTimeout(chat);
	deleteCookie();
	beginChatBtn.style.display = 'block';
}