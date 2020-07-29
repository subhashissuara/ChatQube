import React, {Component} from 'react';
import _ from 'lodash';
import classNames from 'classnames';

class UserForm extends Component{
    constructor(props){
        super(props);

        this.state = {
            message: null,
            isLogin: true,
            user: {
                name: '',
                email: '',
                password: ''
            }
        }

        this.onSubmit = this.onSubmit.bind(this);
        this.onTextFieldChange = this.onTextFieldChange.bind(this);
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

    onSubmit(event){
        const {user, isLogin} = this.state;
        const {store} = this.props;
        event.preventDefault();
        
        this.setState({
            message: null,
        }, () => {
            if(isLogin){
                store.login(user.email, user.password).then((user) => {
                    if(this.props.onClose){
                        this.props.onClose();
                    }
                   
                }).catch((err) => {
                    console.log("Error: ", err);
                    this.setState({
                        message: {
                            body: err,
                            type: 'error',
                        }
                    });
                })
            }
            else{
                store.register(user).then((_) => {
                    this.setState({
                        message: {
                            body: "Account Created!",
                            type: 'success',
                        }
                    }, () => {
                        // Login the user
                        store.login(user.email, user.password).then(() => {
                            if(this.props.onClose){
                                this.props.onClose();
                            }
                        })
                    })
                });
            }
        })
    }

    onTextFieldChange(event){
        let {user} = this.state;
        const field = event.target.name;
        user[field] = event.target.value;
        this.setState({
            user: user
        });
    }

    render(){
        const {user, message, isLogin} = this.state;

        return(
            <div className="user-form" ref={(ref) => this.ref = ref}>
                <form onSubmit={this.onSubmit} method="post">
                {message ? <p className={classNames('login-message', _.get(message, 'type'))}>{_.get(message, 'body')}</p> : null}
                    {!isLogin ? <div className="form-item">
                        <label>Name</label>
                        <input onChange={this.onTextFieldChange} type="text" value={_.get(user, 'name', '')} name="name" placeholder="Your Username"/>
                    </div> : null}
                    <div className="form-item">
                        <label>Email</label>
                        <input value={_.get(user, 'email')} onChange={this.onTextFieldChange} type="email" name="email" placeholder="Email Address" autoComplete="on"/>
                    </div>
                    <div className="form-item">
                        <label>Password</label>
                        <input value={_.get(user, 'password')} onChange={this.onTextFieldChange} type="password" name="password" placeholder="Password" autoComplete="on"/>
                    </div>
                    <div className="form-actions">
                        {isLogin ? <button onClick={() => {
                            this.setState({
                                isLogin: false,
                            })
                        }} type="button">Create Account</button> : null}
                        <button className="primary" type="submit">{isLogin ? 'Sign In' : 'Create Account'}</button>
                    </div>
                </form>
            </div>
        );
    }
}

export default UserForm;