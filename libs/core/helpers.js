'use strict'

function writeToInput(element, value) {
    var date;
    if (element.nodeName === 'INPUT') {
        if (element.type === 'checkbox') {
            element.checked = !!value;
        } else if (element.type === 'radio') {
            element.checked = element.value === value;
        } else if (element.type === 'date') {
            date = value instanceof Date ? value : new Date(value);
            element.value = date.toISOString().split('T')[0];
        } else if (element.type === 'datetime-local') {
            date = value instanceof Date ? value : new Date(value);
            element.value = date.toISOString();
        } else {
            element.value = value;
        }
    } else if (element.nodeName === 'SELECT') {
        element.value = value;
    } else if (element.nodeName === 'TEXTAREA') {
        element.value = value;
    } else {
        element.innerText = value;
    }
}

function readFromInput(element) {
    var result;
    if (element.nodeName === 'INPUT') {
        if (element.type === 'checkbox') {
            result = element.checked;
        } else if (element.type === 'radio') {
            result = element.value;
        } else if (element.type === 'date') {
            result = new Date(element.value);
        } else if (element.type === 'datetime-local') {
            result = new Date(element.value);
        } else {
            result = element.value;
        }
    } else if (element.nodeName === 'SELECT') {
        result = element.value;
    } else if (element.nodeName === 'TEXTAREA') {
        result = element.value;
    }
    return result;
}
