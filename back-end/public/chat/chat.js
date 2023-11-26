// const { sendMsg } = require("../back-end/controllers/group");

const sendbtn = document.querySelector('#sendMsg');
const token = localStorage.getItem('token');
const cancelBtn = document.getElementById('cancel');
const chatBox = document.querySelector('.chats');
let exisChats = [];
let lastId = localStorage.getItem('lastId');
const oldChatsExist = localStorage.getItem('oldChatsExist');
const form = document.querySelector('form');
const userList = document.querySelector('#userList');

async function sendMsg(grpId) {
    try {
        const message = document.querySelector('#comment').value;
        console.log(message);
        const { data } = await axios.post(`http://localhost:5000/group/newMsg?id=${grpId}`, { message }, { headers: { "Authorization": token } });
        document.querySelector('#comment').value = '';
        console.log(data);
    }
    catch (err) {
        console.log(err);
    }
}
async function fetchGrpList() {
    try {
        const { data } = await axios.get('http://localhost:5000/user/groups', { headers: { "Authorization": token } });
        console.log(data);
        document.getElementById('grpList').innerHTML = '';
        data.groups.forEach(group => {
            document.getElementById('grpList').innerHTML += `<li class='list-group-item' id='${group.name}' onclick='fetchChats(${group.id}, event)'>
        <div class='d-flex'><span class='h5 ms-3 me-4'><i class='bi bi-people'></i></span><h4>${group.name}</h4></div></li>`;
        });
    }
    catch (err) {
        console.log(err);
    }
}

window.addEventListener('DOMContentLoaded', async () => {

    // if (localStorage.getItem('chats')) {
    //     exisChats = localStorage.getItem('chats');

    // if (oldChatsExist) {
    //     chats.innerHTML = `<div class="d-flex justify-content-center mb-3"><button class='btn btn-warning btn-sm'>Load older messages</button></div>`;
    // }
    // exisChats = JSON.parse(exisChats);
    // exisChats.forEach(chat => {
    //     chats.innerHTML += `<div class="col-8 mb-1">${chat.sender} : ${chat.message}`;
    // });
    // lastId = exisChats[exisChats.length - 1].id;
    //     console.log(exisChats);
    //     displayChats(exisChats, oldChatsExist);
    // }
    // else {
    //     fetchChats(lastId);
    // }
    if (!token) {
        window.location.href = '../login/login.html';
    }
    // const { data } = await axios.get('http://localhost:5000/user/groups', { headers: { "Authorization": token } });
    // console.log(data);
    // data.groups.forEach(group => {
    //     document.getElementById('grpList').innerHTML += `<li class='list-group-item' id='${group.name}' onclick='fetchChats(${group.id}, event)'>
    //     <div class='d-flex'><span class='h5 ms-3 me-4'><i class='bi bi-people'></i></span><h4>${group.name}</h4></div></li>`;
    // });
    else {
        fetchGrpList();
    }
});

const interval = setInterval(
    () => {
        lastId = localStorage.getItem('lastId');
        fetchChats(lastId);
    }, 5000);
clearInterval(interval);

async function fetchChats(groupId, e) {
    try {
        const { data, data: { chats, oldChats } } = await axios.get(`http://localhost:5000/group/chats?id=${groupId}`, { headers: { "Authorization": token } });
        console.log(data.group);
        document.querySelector('.right').classList.remove('d-none');
        document.getElementById('grpName').textContent = data.group;
        chatBox.innerHTML = '';
        chats.forEach(chat => {
            chatBox.innerHTML += `<div class="col-8 mb-1">${chat.sender} : ${chat.message}`;
            exisChats.push(chat);
        });
        sendbtn.setAttribute('onclick', `sendMsg(${groupId})`);


        // localStorage.setItem('chats', JSON.stringify(exisChats));
        // localStorage.setItem('lastId', exisChats[exisChats.length - 1].id);
        // localStorage.setItem('oldChatsExist', oldChats);
        // displayChats(JSON.stringify(exisChats), oldChats);
        console.log(lastId, localStorage.getItem('lastId'));
    }
    catch (err) {
        console.log(err);
    }
}
function displayChats(chats, oldChatsExist) {
    console.log(oldChatsExist);
    if (oldChatsExist) {
        console.log(oldChatsExist);
        chatBox.innerHTML = `<div class="d-flex justify-content-center mb-3"><button class='btn btn-warning btn-sm'>Load older messages</button></div>`;
    }
    exisChats = JSON.parse(chats);
    console.log(exisChats);
    exisChats.forEach(chat => {
        chatBox.innerHTML += `<div class="col-8 mb-1">${chat.sender} : ${chat.message}`;
    });
}

document.getElementById('createGrp').onclick = async () => {
    try {

        const { data } = await axios.get('http://localhost:5000/user/allusers', { headers: { "Authorization": token } });
        console.log(data);
        document.querySelector('.chatList').classList.toggle('d-none');
        document.querySelector('.group').classList.toggle('d-none');


        data.forEach((user, index) => {
            userList.innerHTML += `<li class="list-group-item"><div class="form-check">
            <input class="form-check-input" type="checkbox" name="participant" id="${user.name}" value="${user.name}">
            <label class="form-check-label" for="${user.name}">${user.name}</label></div></li>`;
        })
    }
    catch (err) {
        console.log(err);
    }
}
cancelBtn.onclick = (e) => {
    userList.innerHTML = '';
    document.querySelector('.group').classList.toggle('d-none');
    document.querySelector('.chatList').classList.toggle('d-none');
}
form.onsubmit = async (e) => {
    try {

        e.preventDefault();
        console.log(e.target);
        const name = e.target.name.value;
        const participants = [];
        let list = form.querySelectorAll('input[type="checkbox"]');
        console.log(list);
        list.forEach(item => { if (item.checked) participants.push(item.value); });
        console.log(participants);
        if (!participants.length) {
            alert('Please select atleast one participant to proceed!');
        }
        else {
            const groupDetails = {
                name, participants
            }
            const { data } = await axios.post('http://localhost:5000/group/participants', groupDetails, { headers: { "Authorization": token } });
            console.log(data);
            document.querySelector('.group').classList.toggle('d-none');
            
            document.querySelector('.chatList').classList.toggle('d-none');
            fetchGrpList();

        }
    }
    catch (err) {
        console.log(err);
    }
}
document.getElementById('bye').onclick = () => {
    window.location.href = '../login/login.html';
    localStorage.removeItem('token');
}