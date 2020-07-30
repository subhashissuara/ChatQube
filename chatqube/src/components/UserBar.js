import React, {Component} from 'react';
import _ from 'lodash';
import UserForm from './UserForm';
import UserMenu from './UserMenu';
import avatarDefault from '../images/avatarDefault.png';

class UserBar extends Component{
    constructor(props){
        super(props);

        this.state = {
            showUserForm: false,
            showUserMenu: false,
        };
    }

    render(){
        const {store} = this.props;
        const me = store.getCurrentUser();
        const profilePicture = _.get(me, 'avatar');
        const isConnected = store.isConnected();

        return(
            <div className="user-bar">
                {!me ? <button onClick={() => {
                    this.setState({
                        showUserForm: true,
                    })
                }} type="button" className="login-button">Sign In</button> : 
                <div onClick={() => {
                        this.setState({
                            showUserMenu: true,
                        })
                    }} className="profile-name"><p className="profile-name-text">{_.get(me, 'name')}</p>
                        <span className="conn-status"><p className="conn-status-text">Status: </p> {me && !isConnected ? <div className="conn-status-reconnect">Disconnected</div> : <div className="conn-status-online">Online</div>}</span></div>
                }
                
                    
                <div onClick={() => {
                    if(me){
                        this.setState({
                            showUserMenu: true,
                        })
                    }
                    else{
                        this.setState({
                            showUserForm: true,
                        })
                    }
                }} className="profile-image"><img src={profilePicture ? profilePicture : avatarDefault} alt="Avatar"/></div>
                {!me && this.state.showUserForm ? <UserForm onClose={() => {
                    this.setState({
                        showUserForm: false,
                    })
                }} store={store} /> : null}

                {this.state.showUserMenu ?
                <UserMenu store={store} onClose={() => {
                    this.setState({
                        showUserMenu: false,
                    })
                }}/> : null}
            </div>
        );
    }
}

export default UserBar;