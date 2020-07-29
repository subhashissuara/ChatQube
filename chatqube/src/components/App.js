import React, { Component } from 'react';
import Store from '../store';
import Messenger from './Messenger';
import {isMobile} from 'react-device-detect';

class App extends Component {

    constructor(props){
        super(props);
        this.state = {
            store: new Store(this),
        }
    }

    componentDidMount(){
        const {store} = this.state;
        store.updateUserOnLoad(); // To prevent loading user before App component is mounted
    }

    render(){
        if(isMobile){
            return(
                <div className="mobile-app">
                        <h1 className="mobile-app-heading">Mobile Version is Coming Soon!</h1>
                        <p className="mobile-app-text">
                        To use <b>ChatQube</b>, open this web application on a PC.
                        </p>
                </div>
            );
        }
        else{
            const {store} = this.state;
            return(
                <div className="messenger-wrapper">
                    <Messenger store = {store}/>
                </div>
            )
        }
    }
}

export default App;