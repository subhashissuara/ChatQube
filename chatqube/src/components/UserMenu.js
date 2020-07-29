import React, {Component} from 'react';
// import _ from 'lodash';

class UserMenu extends Component{
    constructor(props){
        super(props);

        this.onClickOutside = this.onClickOutside.bind(this);
    }

    onClickOutside(event){
        if(this.ref && !this.ref.contains(event.target)){
            if(this.props.onClose){
                this.props.onClose();
            }
        }
    }

    componentDidMount(){
        window.addEventListener('mousedown', this.onClickOutside);
    }

    componentWillUnmount(){
        window.removeEventListener('mousedown', this.onClickOutside);
    }

    render(){
        const {store} = this.props;
        const user = store.getCurrentUser();
        return (
            <div className="user-menu" ref={(ref) => this.ref = ref}>
                {user ?  <ul className="menu">
                    <li>
                        <button type="button">Change Profile Picture</button>
                    </li>
                    <li>
                    <button type="button">Change Password</button>
                    </li>
                    <li>
                    <button onClick={() => {
                        if(this.props.onClose){
                            this.props.onClose();
                        }
                        store.signOut();
                    }} type="button">Sign Out</button>
                    </li>
                </ul>  : null}
            </div>
        );
    }
}

export default UserMenu;