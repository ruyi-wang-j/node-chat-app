// 每個使用者都有不同的socket，代表單一user與server間的連線
// io是整個server和所有users間的連線，可以發送廣播，讓所有users都收到同個訊息
const socket = io(); // 建立WebSocket連接的instance，不一定要命名socket

// Elements，$一般用來表示DOM元素
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = document.querySelector('input');
const $messageFormButton = document.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;


// Options
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true});
const autoscroll = () => {
    // New message element
    const $newMessages = $messages.lastElementChild;

    // Height of the last message
    const newMessageStyles = getComputedStyle($newMessages);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessages.offsetHeight + newMessageMargin;

    // Visable Height
    const visibleHeight = $messages.offsetHeight;

    // Height of messages container
    const containerHeight = $messages.scrollHeight;

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if(containerHeight - newMessageHeight - 5 <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
}

// server (emit) -> client (receive) --acknowledgement --> server
// client (emit) -> server (receive) --acknowledgement --> client

socket.on('message', (message) => {
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('hh:mm a')
    });   // 最後要render的資料（此指訊息）依照messageTemplate格式存成html
    $messages.insertAdjacentHTML('beforeend', html); // 將要新增的資訊插到此div的尾端
    autoscroll();
});

socket.on('locationMessage', (message) => {
    console.log(message);
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('hh:mm a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('roomData', ({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    document.querySelector('#sidebar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault(); // 避免page refresh

    $messageFormButton.setAttribute('disabled', 'disabled');
    // disabled "Send" Button，避免重複點擊（誤觸） 

    // e.target：listen的對象
    // .elements：其中的元素，後面message為name
    // 此法不會重新查詢；querySelector寫法會重新查詢
    const message = e.target.elements.message.value;
    socket.emit('sendMessage', message, (error) => {
        $messageFormButton.removeAttribute('disabled');
        $messageFormInput.value = ''; // 送出後自動清空
        $messageFormInput.focus();    // 可以接著打字，不用點擊輸入框

        // enabled "Send" Button

        if(error){
            return console.log(error);
        }
        console.log('Message delivered!');
    });
});
// 查詢html元素有3種方法
// 1. document.querySelector('元素別' or '#id').value
// 2. id.value
// 3. 1中的e.target.elements.name.value

$sendLocationButton.addEventListener('click', () => {
    // 有些client版本沒有此功能
    if(!navigator.geolocation){
        return alert('Geolocation is not support by your browser.');
    }
    $sendLocationButton.setAttribute('disabled', 'disabled');

    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            lat: position.coords.latitude,
            long: position.coords.longitude
        }, () => {
            console.log('Location shared!');
            $sendLocationButton.removeAttribute('disabled');
        });
    });
});

socket.emit('join', {username, room}, (error) => {
    if(error){
        alert(error);
        location.href = '/'; // 回到join page
    }
});