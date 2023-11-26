const form = document.querySelector('form');

form.onsubmit = async (e) => {
    try {
        e.preventDefault();
        console.log(e.target);
        const email = e.target.mail.value;
        const password = e.target.password.value;
        const loginData = { email, password };
        const { data } = await axios.post('http://localhost:5000/user/login', loginData);
        console.log(data);
        localStorage.setItem('token', data.token);
        alert(data.message);
        window.location.href = '../chat/chat.html';
    }
    catch (err) {
        console.log(err);
        const message = document.createElement('div');
        message.className = 'd-flex my-3 justify-content-center';
        message.innerHTML = `<p class='lead d-inline-flex text-center text-white bg-danger px-3 py-2 rounded'>${err.response.data.message}</p>`;
        document.querySelector('body').appendChild(message);
        setTimeout(() => { message.remove() }, 2500);
        // alert(err.response.data.message);
        const messedUp = document.createElement('div');
        messedUp.className = '';
    }
}