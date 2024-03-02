"use strict";

const sendbtn = document.querySelector('#sendMsg');
const token = localStorage.getItem('token');
const cancelBtn = document.getElementById('cancel');
const chatBox = document.querySelector('.chats');
let reqHeight;
let lastId = localStorage.getItem('lastId');
const oldChatsExist = localStorage.getItem('oldChatsExist');
const form = document.querySelector('form');
const form2 = document.getElementById('send');
const userList = document.querySelector('#userList');
let loggedInUser;
let loggedInUserId;
let isAdmin;

const socket = io();
socket.on('connect', async _ => {
    try {
        await axios.post(`/user/update`, { connectionId: socket.id });
        console.log(`connected with ${socket.id}`);
    } catch (err) {
        console.log(err);
        if (err.response.status === 401) {
            alert('Please login again');
            return window.location.href = '/login.html';
        }
        socket.disconnect();
        alert('Something went wrong, please reload the page!');
    }
});
window.addEventListener('DOMContentLoaded', async () => {
    try {
        reqHeight = window.innerHeight - (document.querySelector('.right .navbar').offsetHeight + document.querySelector('.send').offsetHeight);
        chatBox.style.height = `${reqHeight}px`;
        fetchGrpList();
    }
    catch (err) {
        console.log(err);
        if (err.response.status === 401) {
            alert('Please login again!');
            window.location.href = '/login.html';
        }
    }
});

socket.on('member-added', (group, groupId) => {
    document.getElementById('grpList').innerHTML += `<li class='list-group-item' id='${group}' onclick='fetchChats(${groupId}, event)'>
        <div class='d-flex'><span class='h5 ms-3 me-4'><i class='bi bi-people'></i></span><h4>${group}</h4></div></li>`;
    socket.emit('join-group', groupId);
})
socket.on('u r removed', (group) => {
    console.log(group);
    closeGrp('Others', group);
    fetchGrpList();
})
socket.on('sent-msgs', (content) => {
    if (+chatBox.id === content.groupId) {
        displayChat(content.sender, content.message, content.format);
    }
});
socket.on('change-status', (group, groupId) => {
    console.log(group, groupId);
    if (document.getElementById('grpName').textContent === group) {
        console.log('yes the group is open');
        groupInfo(groupId, true);
    }
})
socket.on('disconnect', () => {
    console.log(socket.id, 'disconnected');
})

async function fetchGrpList() {
    try {
        const { data } = await axios.get('/user/groups');
        console.log(data);
        document.getElementById('grpList').innerHTML = '';
        data.groups.forEach(group => {
            socket.emit('join-group', group.id);
            // The onclick of every li is an example of event bubbling.
            document.getElementById('grpList').innerHTML += `<li class='list-group-item mb-1'
             id='${group.name}' onclick='fetchChats(${group.id})'>
            <div class='d-flex'><span class='h5 ms-3 me-4'><i class='bi bi-people'></i>
            </span><h4>${group.name}</h4></div></li>`;
        });
    }
    catch (err) {
        console.log(err);
    }
}
async function fetchChats(groupId) {
    try {
        const { data, data: { chats } } = await axios.get(`/group/chats?id=${groupId}`);
        isAdmin = data.isAdmin;
        const groupName = data.group;

        document.querySelector('.left').classList.add('d-none');
        document.querySelector('.right').classList.remove('d-none');

        document.getElementById('grpName').textContent = groupName;

        chatBox.innerHTML = '';
        loggedInUser = data.loggedInUser;
        loggedInUserId = data.loggedInUserId;
        chatBox.id = groupId;

        if (chats.length) {
            console.log(chats[0].createdAt, new Date(chats[0].createdAt).toDateString());
        }
        chats.forEach(chat => {
            const sender = chat.sender === loggedInUser ? 'You' : chat.sender;
            displayChat(sender, chat.message, chat.format);
        });

        document.getElementById('files').removeAttribute('disabled');
        sendbtn.removeAttribute('disabled');
        sendbtn.setAttribute('onclick', `sendMsg(${groupId}, event)`);

        document.querySelector('.navbar-nav .btn-close').onclick = () => {
            document.querySelector('.right').classList.add('d-none');
            document.querySelector('.left').classList.remove('d-none');
        }
        document.querySelector('button[title="Info"]').setAttribute('onclick', `groupInfo(${groupId}, ${isAdmin})`);
        document.querySelector('.right a').setAttribute('onclick', `groupInfo(${groupId}, ${isAdmin})`);

        document.querySelector('.rounded-pill').setAttribute('onclick', `fetchNonParticipants(${groupId}, '${groupName}', event)`);
    }
    catch (err) {
        console.log(err);
    }
}
async function sendMsg(grpId, e) {
    try {
        const message = document.querySelector('#comment').value;
        const files = document.getElementById('files').files;
        const formData = new FormData();
        for (let a = 0; a < files.length; a++) {
            formData.append('files', files[a]);
        }
        formData.set('message', message);

        document.querySelector('#comment').value = '';
        document.getElementById('files').value = '';

        // Axios automatically adds the mutipart Content-Type header for us and
        // jwt token is sent along with cookies, so no token in authorization headers.
        const { data } = await axios.post(`/group/newMsg?id=${grpId}`, formData);
        console.log(data);
        data.forEach(chat => {
            socket.emit('new-msg', chat);
            if (+chatBox.id === chat.groupId) {
                displayChat('You', chat.message, chat.format);
            }
        })
    }
    catch (err) {
        console.log(err);
        alert(`${err.response.data}`);
    }
}
async function groupInfo(grpId, boolean) {
    try {
        const { data } = await axios.get(`/group/info?grpId=${grpId}`);
        const groupName = document.getElementById('grpName').textContent;
        document.getElementById('offcanvasRightLabel').textContent = groupName;
        document.querySelector('.offcanvas-body h5').textContent = `Participants (${data.length + 1})`;
        document.getElementById('part').innerHTML = '';
        let Class = 'd-none';
        console.log(boolean);
        let role = 'Member';
        if (boolean) {
            role = 'Admin'
            Class = '';
            document.querySelector('.rounded-pill').classList.remove('d-none');
        }
        else if (!document.querySelector('.rounded-pill').classList.contains('d-none')) {
            document.querySelector('.rounded-pill').classList.add('d-none');
        }
        document.getElementById('part').innerHTML = `<div class="d-flex px-4 my-3">
        <div class="dropdrown ms-md-5 ms-0">${loggedInUser} (You)
        <span class="dropdown-toggle ${Class}" data-bs-toggle="dropdown"></span>
        <div class="dropdown-menu">                
        <li class="dropdown-item" onclick="removeFromGrp(${loggedInUserId}, ${grpId})">Leave the group</li>
        </div>                    
            </div><div class="ms-auto me-md-5 me-0">${role}</div>`;
        data.forEach(user => {
            let status = 'Member';
            let liClass = '';
            if (user.participant.isAdmin) {
                status = 'Admin';
                liClass = 'd-none';
            }
            document.getElementById('part').innerHTML += `<div class="d-flex px-4 my-3">
            <div class="dropdrown ms-md-5 ms-0">${user.name}
                <span class="dropdown-toggle ${Class}" data-bs-toggle="dropdown">
                </span><div class="dropdown-menu">
                <li class="dropdown-item ${liClass}" onclick="makeAdmin(${user.id}, ${grpId})">Make Admin</li>
                <li class="dropdown-item" onclick="removeFromGrp(${user.id}, ${grpId})">Remove from group</li>
                </div></div><div class="ms-auto me-md-5 me-0">${status}</div></div>`
        })
    }
    catch (err) {
        console.log(err);
    }
};
async function fetchNonParticipants(grpId, grpName, e) {
    try {
        if (e.target.getAttribute('aria-expanded') === 'true') {

            const { data } = await axios.get(`/group/newUsers?grpId=${grpId}`);

            document.querySelector('#collapseExample').innerHTML = `<div class="card card-body overflow-auto">
            <div class="input-group"><div class="input-group-prepend">
            <span class="input-group-text rounded-end-0"><i class="bi bi-search"></i></span>
            </div><input class="form-control" type="search" id="searchNonParticipant"
             placeholder="Search by name, mobile, e-m@il" /></div><div class="card my-1">
            <ul class="list-group list-group-flush" id="nonParticipants"></ul></div>
            <button class="btn btn-default" id="stop" type="button"
             onclick="document.querySelector('#collapseExample').classList.remove('show')">
             Cancel</button><button class="btn btn-outline-success" id="addNew" 
             onclick="addParticipants(${grpId}, '${grpName}')">Ok</button></div>`;

            document.getElementById('nonParticipants').innerHTML = '';
            data.forEach(user => {
                document.getElementById('nonParticipants').innerHTML += `<li class="list-group-item addParticipant"><div class="form-check">
            <input class="form-check-input" type="checkbox" name="nonParticipant" id="${user.id}" value="${user.id}">
            <label class="form-check-label" for="${user.id}">${user.name}</label>
            <div class="d-none">${user.phone}<div class="grandChild">${user.email}</div></div></div></li>`;
            });

            const searchNonParticipant = document.getElementById('searchNonParticipant');
            searchNonParticipant.oninput = function () {
                searchOnInput(this, '.addParticipant')
            };
        }
    }
    catch (err) {
        console.log(err);
    }
};
async function addParticipants(grpId, grpName) {
    try {
        const newParticipants = [];
        const nodeList = document.querySelectorAll('.right input[type="checkbox"]');
        console.log(nodeList);
        nodeList.forEach(item => { if (item.checked) newParticipants.push(item.value); });
        if (!newParticipants.length) {
            alert('Please select atleast one participant to proceed!');
        }
        else {
            const groupDetails = { grpId, newParticipants };
            const { data } = await axios.post('/group/addParticipants', groupDetails);
            data.connections.forEach(connection => {

                socket.emit('add-member', connection, grpName, grpId);
            });
            document.querySelector('#collapseExample').classList.remove('show');
            groupInfo(grpId, isAdmin);
        }
    }
    catch (err) {
        console.log(err);
    }
}
async function makeAdmin(userId, grpId) {
    try {

        const { data: { connection, group } } = await axios.put(`/group/makeAdmin/${userId}/?grpId=${grpId}`);
        groupInfo(grpId, isAdmin);
        console.log(connection, group);
        socket.emit('made-admin', connection, group.name, group.id);
    }
    catch (err) {
        console.log(err);
    }
}
async function removeFromGrp(userId, grpId) {
    try {
        const { data: { socketId, result } } = await axios.delete(`/group/removeParticipant/${userId}/?grpId=${grpId}`);
        if (loggedInUserId !== userId) {
            groupInfo(grpId, isAdmin);
            socket.emit('removed participant', socketId, result.group);
        }
        else {
            closeGrp('You', result.group);
            fetchGrpList();
        }
    }
    catch (err) {
        console.log(err);
    }
}

document.getElementById('createGrp').onclick = async () => {
    try {
        document.getElementById('createGrp').classList.toggle('d-none');
        const { data } = await axios.get('/user/allusers');
        console.log(data);
        document.querySelector('.chatList').classList.toggle('d-none');
        document.querySelector('.group').classList.toggle('d-none');

        userList.innerHTML = '';
        data.forEach((user, index) => {
            userList.innerHTML += `<li class="list-group-item createGrp"><div class="form-check">
            <input class="form-check-input" type="checkbox" name="participant" id="${user.id}" value="${user.id}">
            <label class="form-check-label" for="${user.id}">${user.name}</label>
            <div class="d-none">${user.phone}<div class="grandChild">${user.email}</div></div></div></li>`;
        })
    }
    catch (err) {
        console.log(err);
    }
}
const searchUser = document.getElementById('searchUser');
searchUser.oninput = function () { searchOnInput(this, '.createGrp') }

cancelBtn.onclick = (e) => {
    userList.innerHTML = '';
    document.querySelector('.group').classList.toggle('d-none');
    document.querySelector('.chatList').classList.toggle('d-none');
    document.getElementById('createGrp').classList.toggle('d-none');
}
form.onsubmit = async (e) => {
    try {
        e.preventDefault();
        console.log(e.target);
        const name = e.target.name.value;
        const participants = [];
        let list = form.querySelectorAll('.left input[type="checkbox"]');
        list.forEach(item => { if (item.checked) participants.push(item.value); });
        if (!participants.length) {
            alert('Please select atleast one participant to proceed!');
        }
        else {
            const groupDetails = { name, participants };
            const { data } = await axios.post('/group/participants', groupDetails);
            data.connections.forEach(connection => {
                socket.emit('add-member', connection, name, data.groupId);
            })
            document.querySelector('.group').classList.toggle('d-none');
            document.querySelector('.chatList').classList.toggle('d-none');
            fetchGrpList();
            document.getElementById('createGrp').classList.toggle('d-none');
            form.reset();
        }
    }
    catch (err) {
        console.log(err);
    }
}

document.getElementById('bye').onclick = async () => {
    try {
        await axios.get('/user/logout');
        this.location.href = '/login.html';
    } catch (err) {
        console.log(err);
    }
}

function closeGrp(string, group) {

    if (document.getElementById('grpName').textContent === group) {

        document.querySelector('.offcanvas-end').classList.remove('show');
        document.getElementById('grpName').textContent = 'Example';
        document.querySelector('button.border-0').removeAttribute('onclick');
        document.querySelector('.right a').removeAttribute('onclick');

        chatBox.innerHTML = `<div class="row px-2 my-3">
        <div class="col-auto ms-auto rounded-2">Jimmy: Hi there!</div>
        </div><div class="row px-2 my-3">
        <div class="col-auto me-auto rounded-2">Anderson: Hello!</div></div>
        <div class="row px-2 my-3">
        <div class="col-auto ms-auto rounded-2">Jimmy: R u watching the CWC Final today?</div>
        </div><div class="row px-2 my-3">
        <div class="col-auto me-auto rounded-2">Anderson: No buddy, not a cricket fan.</div>
        </div><div class="row px-2 my-3"><div class="col-auto ms-auto rounded-2">Jimmy: Oh!</div>
        </div><div class="row px-2 my-3"><div class="col-auto me-auto rounded-2">Anderson: Yeah!</div>
        </div>`;

        sendbtn.setAttribute('disabled', 'true');
        document.getElementById('offcanvasRightLabel').textContent = 'Example';
        document.querySelector('.offcanvas-body h5').textContent = 'Participants (2)';
        document.getElementById('part').innerHTML = `<div class="d-flex px-4 my-3">
        <div class="dropdrown ms-md-5 ms-0">Jimmy(You)</div>
        <div class="ms-auto me-md-5 me-0">Member</div></div><div class="d-flex px-4 my-3">
        <div class="dropdrown ms-md-5 ms-0">Anderson</div>
        <div class="ms-auto me-md-5 me-0">Member</div></div>`;
    }
    if (string === 'You') {
        alert(`You just left '${group}' group!`);
    }
    else {
        alert(`You have been removed from '${group}' group!`);
    }
}

function displayChat(sender, message, format) {
    const marginClass = sender === 'You' ? 'ms' : 'me';
    const fixedHTMLContent = `<div class="row px-2 my-2">
                            <div class="col-auto ${marginClass}-auto m-1 ps-2 rounded-2">
                            <div class="sender">${sender}</div>`;
    if (format === "text") {
        chatBox.innerHTML += `${fixedHTMLContent}<div class="mt-1 mb-2 ms-2">
                            ${message}</div></div>`;
    }
    else if (format.includes('image')) {
        chatBox.innerHTML += `${fixedHTMLContent}<div class="mt-1 mb-3 ms-2">
                            <a href="${message}" target="_blank"><img src="${message}" 
                            alt="alt" class="img-fluid rounded" loading="lazy"
                            onerror="setTimeout(() => this.src=this.src, 3000)" />
                            </a></div></div></div>`;
    }
    else if (format.includes('audio')) {
        chatBox.innerHTML += `${fixedHTMLContent}<div class="mt-1 mb-2 ms-2">
                            <audio controls><source src='${message}' type='${format}'>
                            </audio></div></div></div>`
    }
    else if (format.includes('video')) {
        chatBox.innerHTML += `${fixedHTMLContent}<div class="mt-1 mb-2 ms-2">
                            <video class='rounded' controls><source src='${message}' 
                            type='${format}'></video></div></div></div>`
    } else {
        chatBox.innerHTML += `${fixedHTMLContent}<div class="mt-1 mb-2 ms-2">
                            <a href="${message}" target="_blank">${decodeURI(message).split('_')[1]}</a>
                            </div></div></div>`;
    }
}

function searchOnInput(element, selector) {

    document.querySelectorAll(selector).forEach(li => {
        if (li.textContent.toLowerCase().indexOf(element.value.toLowerCase()) < 0) {
            li.classList.add('d-none');
        } else {
            li.classList.remove('d-none');
        }
    })
}

window.onresize = () => {
    const navHeight = document.querySelector('.right .navbar').offsetHeight;
    const sendBoxHeight = document.querySelector('.send').offsetHeight;
    const heightToBeSubtracted = navHeight + sendBoxHeight;
    if (screen.width > 600) {
        reqHeight = window.innerHeight - heightToBeSubtracted;
    } else {
        reqHeight = screen.availHeight - heightToBeSubtracted;
    }
    chatBox.style.height = `${reqHeight}px`;
}
