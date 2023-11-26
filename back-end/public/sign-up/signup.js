const form = document.querySelector('form');
const submit = document.querySelector('.btn-outline-primary');

form.onsubmit = async (e) => {
    try {
        e.preventDefault();
        const name = e.target.name.value;
        const email = e.target.mail.value;
        const phone = e.target.phone.value;
        const password = e.target.password.value;

        const userData = { name, phone, email, password };
        const { data } = await axios.post('http://localhost:5000/user/signup', userData);
        alert('Successfully signed up!');
        const message = document.createElement('div');
        message.className = 'd-flex justify-content-center';
        message.innerHTML = `<p class='lead d-inline-flex text-center text-white bg-info px-3 py-2 rounded'>${data.message}</p>`;
        document.querySelector('body').appendChild(message);
        setTimeout(_ => {
            message.remove();
            window.location.href = '../login/login.html';
        }, 2500);
        console.log(data);
    }
    catch (err) {
        console.log(err, 'while post request');
        alert(err.response.data.message);
    }
}