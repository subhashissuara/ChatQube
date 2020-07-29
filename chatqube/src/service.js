import axios from 'axios';
import {backendApiURL} from './config'

const apiURL = backendApiURL;

class Service{
    get(endpoint, options = null){
        const url = `${apiURL}/${endpoint}`;
        return axios.get(url, options);
    }

    post(endpoint = "", data = {}, options = {headers: {'Content-Type': 'application/json'}}){
        const url = `${apiURL}/${endpoint}`;
        return axios.post(url, data, options);
    }
}

export default Service;