const { ipcRenderer } = require('electron');
const JSONFormatter = require('json-formatter-js');

document.getElementById('listen-btn').addEventListener('click', (event) => {

    const statusLight = document.getElementById('status-light');
    const btn = event.target.closest('button');
    const icon = btn.getElementsByClassName('svg-inline--fa')[0];
    const statusBar = document.getElementById('status-bar');

    if (btn.classList.contains('running')) {
        // stop http server
        ipcRenderer.send('stop-server');

        btn.classList.remove('running');
        icon.classList.remove('fa-stop');
        icon.classList.add('fa-play');
        statusLight.classList.remove('status-light-on');
        statusLight.classList.add('status-light-off');

        statusBar.classList.remove('status-bar-on');
        statusBar.classList.add('status-bar-off');
    } else {
        // start http server
        const port = document.getElementById('port-input').value;
        console.log(`Starting server on port ${port}`);
        ipcRenderer.send('start-server', port);

        btn.classList.add('running');
        icon.classList.remove('fa-play');
        icon.classList.add('fa-stop');
        statusLight.classList.remove('status-light-off');
        statusLight.classList.add('status-light-on');

        statusBar.classList.remove('status-bar-off');
        statusBar.classList.add('status-bar-on');
    }

});

ipcRenderer.on('request-received', (event, requestDetail) => {
    updateRequestList(requestDetail);
    // updateRequestDetails(requestDetail);
});

function updateRequestList(request) {
    const requestList = document.getElementById('request-list');
    const requestElement = document.createElement('div');
    requestElement.classList.add('request-summary');
    requestElement.innerHTML = `<span class="badge ${methodColor(request.method)}">${request.method}</span> <span >#${request.id.split('-')[0]} </span><br> <span class="request-summary-time"> ${formatDate(request.time)}</span>`;
    requestElement.addEventListener('click', () => {
        updateRequestDetails(request);
        requestList.childNodes.forEach((n) => n.classList.remove('request-summary-selected'));
        requestElement.classList.add('request-summary-selected')
    });
    if (requestList.firstChild) {
        requestList.insertBefore(requestElement, requestList.firstChild);
    } else {
        requestList.appendChild(requestElement);
    }
}

function updateRequestDetails(request) {
    console.log(request);

    document.getElementById('no-content').style.display = 'none';
    document.getElementById('has-content').style.display = 'block';


    const methodElement = document.getElementById('method');
    methodElement.className = '';
    methodElement.classList.add("badge", methodColor(request.method))
    methodElement.innerHTML = `${request.method}`;
    const pathElement = document.getElementById('path');
    pathElement.innerHTML = `${request.url.split('?')[0]}`;

    document.getElementById('summary-req-id').innerHTML = `${request.id}`;
    document.getElementById('summary-version').innerHTML = `${request.httpVersion}`;;
    document.getElementById('summary-time').innerHTML = `${formatDate(request.time)}`;
    document.getElementById('summary-ip').innerHTML = `${request.ip}`;
    document.getElementById('summary-size').innerHTML = `${request.size} Bytes`

    const queriesElement = document.getElementById('query-tr');
    removeAllChild(queriesElement);
    for (const key in request.queries) {
        const queryElementRow = document.createElement('tr');

        const queryElementKey = document.createElement('td');
        queryElementKey.innerHTML = `${key}`;
        queryElementRow.appendChild(queryElementKey);

        const queryElementValue = document.createElement('td');
        queryElementValue.innerHTML = `${request.queries[key]}`;
        queryElementRow.appendChild(queryElementValue);
        queriesElement.appendChild(queryElementRow);

    }

    const headersElement = document.getElementById('header-tr');
    removeAllChild(headersElement)
    for (const key in request.headers) {
        const headerElementRow = document.createElement('tr');

        const headerElementKey = document.createElement('td');
        headerElementKey.innerHTML = `${capitalizeHeader(key)}`;
        headerElementRow.appendChild(headerElementKey);

        const headerElementValue = document.createElement('td');
        headerElementValue.innerHTML = `${request.headers[key]}`;
        headerElementRow.appendChild(headerElementValue);

        headersElement.appendChild(headerElementRow);
    }


    const bodyElement = document.getElementById('body-content');
    const rawBodyElement = document.getElementById('body-raw');

    if (bodyElement.firstChild) {
        bodyElement.removeChild(bodyElement.firstChild);
        rawBodyElement.removeChild(rawBodyElement.firstChild)
    }
    if (request.body) {
        const formatter = new JSONFormatter(
            JSON.parse(request.body),
            true,
            // { theme: "dark"}
        );

        bodyElement.appendChild(formatter.render());
        formatter.openAtDepth(Infinity);

        setTimeout(()=>{
            var links = document.querySelectorAll('.json-formatter-url');
            for (var i = 0; i < links.length; i++) {
                links[i].setAttribute('target', '_blank');
            }
        },400)
        

        rawBodyElement.innerText = request.body;
    }
}


function capitalizeHeader(key) {
    return key.replace(/(^|-)(\w)/g, (match, dash, char) => dash + char.toUpperCase());
}


const closeBtn = document.getElementById('close-btn');
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');

closeBtn.addEventListener('click', () => {
    ipcRenderer.send('close-app');
});

minBtn.addEventListener('click', () => {
    ipcRenderer.send('minimize-app');

});

maxBtn.addEventListener('click', () => {
    ipcRenderer.send('maximize-restore-app');
});


function methodColor(method) {
    switch (method) {
        case 'GET':
            return 'bg-success';
        case 'POST':
            return 'bg-warning';
        case 'PUT':
            return 'bg-primary';
        case 'DELETE':
            return 'bg-danger';
        case 'PATCH':
            return 'bg-info';
        default:
            return 'bg-secondary';
    }
}

function formatDate(date) {
    const pad = (s) => (s < 10 ? '0' + s : s);
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate())
    ].join('-') +
        ' ' +
        [
            pad(date.getHours()),
            pad(date.getMinutes()),
            pad(date.getSeconds())
        ].join(':');
}


const divider = document.getElementById('drag-handle');
const leftPanel = document.getElementById('request-list');
const rightPanel = document.getElementById('request-details');
let isDragging = false;

divider.addEventListener('mousedown', function (e) {
    e.preventDefault();
    isDragging = true;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
});

function onDrag(e) {
    const mainContentOffsetLeft = document.getElementById('main-content').offsetLeft;
    const mainContentWidth = document.getElementById('main-content').offsetWidth;
    const leftWidth = e.clientX - mainContentOffsetLeft;
    const rightWidth = mainContentWidth - leftWidth;
    leftPanel.style.width = `${leftWidth}px`;
    rightPanel.style.width = `${rightWidth}px`;
}

function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

function removeAllChild(node) {
    if (node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

}