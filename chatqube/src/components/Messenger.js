import React, { Component } from 'react';
import className from 'classnames';
// import avatarDefault from '../images/avatarDefault.png';
// import settingsIcon from '../images/settings.png';
import messageIcon from '../images/message.png';
import sendIcon from '../images/send.png';
import {OrderedMap} from 'immutable';
import _ from 'lodash';
import {ObjectID} from '../helpers/objectid';
import SearchUser from './SearchUser';
import UserBar from './UserBar'
import moment from 'moment';

class Messenger extends Component {

    constructor(props){
        super(props);

        this.state = {
            height: window.innerHeight,
            newMessage: '',
            searchUser: '',
            showSearchUser: false,
        }

        this._onResize = this._onResize.bind(this);
        this.handleSend = this.handleSend.bind(this);
        this.renderMessage = this.renderMessage.bind(this);
        this.scrollToBottomMessage = this.scrollToBottomMessage.bind(this);
        this._onCreateChannel = this._onCreateChannel.bind(this);
        this.renderChannelTitle = this.renderChannelTitle.bind(this);
        this.renderChannelAvatars = this.renderChannelAvatars.bind(this);
    }

    renderChannelAvatars(channel){
        const {store} = this.props;
        const members = store.getMembersFromChannel(channel);
        const maxDisplayNumber = 4;
        const total = members.size > maxDisplayNumber ? maxDisplayNumber : members.size;
        const avatars = members.map((user, index) => {
            return index < maxDisplayNumber ? <img key={index} src={_.get(user, 'avatar')} alt={_.get(user, 'name')} /> : null
        });

        return <div className={className('channel-avatars', `channel-avatars-${total}`)}>{avatars}</div>
    }

    renderChannelTitle(channel = null){
        if(!channel){
            return null;
        }
        const {store} = this.props;
        const members = store.getMembersFromChannel(channel);
        const names = [];
        members.forEach((user) => {
            const name = _.get(user, 'name');
            names.push(name);
        });

        let title = _.join(names, ', ');
        if(!title && _.get(channel, 'isNew')){
            title = 'New Channel';
        }

        return(
            <h2>{title}</h2>
        );
    }

    _onCreateChannel(){
        const {store} = this.props;

        const currentUser = store.getCurrentUser();
        const currentUserId = _.get(currentUser, '_id');

        const channelId = new ObjectID().toString();
        const channel = {
            _id: channelId,
            title: "",
            lastMessage: "",
            members: new OrderedMap(),
            messages: new OrderedMap(),
            isNew: true,
            userId: currentUserId,
            created: new Date(),
        };
        channel.members = channel.members.set(currentUserId, true);
        store.onCreateNewChannel(channel);
    }
    scrollToBottomMessage(){
        if(this.messageRef){
            this.messageRef.scrollTop = this.messageRef.scrollHeight;
        }
    }

    renderMessage(message){
        const messageBody = _.get(message, 'body', '');
        const html =  _.split(messageBody, '\n').map((m, key) => {
            return <p key={key} dangerouslySetInnerHTML={{__html: m}}></p>
        })
        return html;
    }
    
    handleSend(){
        const {newMessage} = this.state;
        const {store} = this.props;

        if (_.trim(newMessage).length){
            const messageId = new ObjectID().toString();
            const channel = store.getActiveChannel();
            const channelId = _.get(channel, '_id', null)
            const currentUser = store.getCurrentUser();
            const message = {
                _id: messageId,
                channelId: channelId,
                body: newMessage,
                userId: _.get(currentUser, '_id'),
                me: true,
            };
            store.addMessage(messageId, message);
            this.setState({
                newMessage: '',
            })
        }
    }

    _onResize(){
        this.setState({
            height: window.innerHeight
        });
    }

    componentDidMount(){
        window.addEventListener('resize', this._onResize);
    }

    componentDidUpdate(){
        this.scrollToBottomMessage();
    }

    componentWillUnmount(){
        window.removeEventListener('resize', this._onResize);
    }

    render(){
        const {store} = this.props;
        const {height} = this.state;

        const messengerStyle = {
            height: height - 50, // Removing header height
        }

        const activeChannel = store.getActiveChannel();
        const messages = store.getMessagesFromChannel(activeChannel);
        const channels = store.getChannels();
        const members = store.getMembersFromChannel(activeChannel);
        const me = store.getCurrentUser();
        
        return(
            <div className="messenger">
                <div className="messenger-header">
                    <div className="left">
                        {/* <div className="left-action"><button><img src={settingsIcon} alt="Settings"/></button></div> */}
                        <h2>ChatQube<sup>BETA</sup></h2>
                        {me ? <div onClick={this._onCreateChannel}className="right-action"><button><img src={messageIcon} alt="New Message"/></button></div> : null}
                    </div>
                <div className="middle">
                    {_.get(activeChannel, 'isNew') ? 
                    <div className="toolbar">
                        <label >To:</label>
                        {
                            members.map((user, key) => {
                                return(
                                <span onClick={() => {
                                    store.removeMemberFromChannel(activeChannel, user)
                                }} key={key}>{_.get(user, 'name')}</span>
                                ); 
                            })
                        }
                        <input placeholder="Type username..." onChange={(event) => {
                            const searchUserText = _.get(event, 'target.value')
                            this.setState({
                                searchUser: searchUserText,
                                showSearchUser: true,
                            }, () => {
                                store.startSearchUsers(searchUserText);
                            });
                        }} type="text" value={this.state.searchUser}/>
                        {this.state.showSearchUser ? <SearchUser 
                        onSelect={(user) => {
                            this.setState({
                                showSearchUser: false,
                                searchUser: '',
                            }, () => {
                                const userId = _.get(user, '_id');
                                const channelId = _.get(activeChannel, '_id');

                                store.addUserToChannel(channelId, userId);
                            });
                        }}
                        store={store}/> : null}
                    </div> : this.renderChannelTitle(activeChannel) /*Avoid Overflow in CSS*/} 
                    </div>
                    <div className="right">
                        <UserBar store={store} />
                    </div>
                </div>
                <div style={messengerStyle} className="messenger-body">
                    <div className="messenger-sidebar-left"> 
                        <div className="channels">
                            {channels.map((channel, key) => {
                                return (
                                    <div onClick={(key) => {
                                        store.setActiveChannelId(channel._id);
                                    }
                                }
                                    key={channel._id} 
                                    className={className('channel', {'notify': _.get(channel, 'notify') === true}, {'active': _.get(activeChannel, '_id') === _.get(channel, '_id', null)})}>
                                     <div className="user-image">
                                        {this.renderChannelAvatars(channel)}
                                    </div>
                                    <div className="channel-info">
                                      {this.renderChannelTitle(channel)}
                                    <p>{channel.lastMessage}</p>
                                </div>
                            </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="messenger-content">
                        <div ref={(ref) => this.messageRef = ref} className="messages">
                            {me ? messages.map((message, index) => {

                                const user = _.get(message, 'user');
                                return(
                                <div key={index} className={className('message', {'me': message.me})}>
                                    <div className="message-user-image"><img src={_.get(user, 'avatar')} alt="Avatar"/></div>
                                    <div className="message-body">
                                        <div className="message-author">{message.me ? "You said:" : _.get(message, 'user.name', '') + " says:"}</div>
                                        <div className="message-text">
                                        {this.renderMessage(message)}
                                        </div>
                                    </div>
                                </div>
                            )
                            }) : <div className="signin-message"><h1>Click on Sign In to Get Started!</h1></div>}
                        </div>
                        {activeChannel && members.size > 0 ? <div className="message-input">
                            <div className="text-input">
                                <textarea onKeyUp={(event) => {
                                    if (event.key === 'Enter' && !event.shiftKey){
                                        this.handleSend();
                                    }
                                }} onChange={(event) => {
                                    this.setState({newMessage: _.get(event, 'target.value')});
                                }} value={this.state.newMessage} placeholder="Type a message... (Shift + Enter for Newline)" name="" id="" cols="30" rows="10"></textarea>
                            </div>
                            <div className="actions">
                                <button onClick={this.handleSend} className="send"><img src={sendIcon} alt="Send"/></button>
                            </div>
                        </div> : null}
                    </div>
                    <div className="messenger-sidebar-right">
                        {members.size > 0 ? <div>
                            <h2 className="title">Chat Members</h2>
                            <div className="members">
                                {members.map((member, key) => {
                                    const isOnline = _.get(member, 'online', false);
                                    return (
                                        <div key={key} className="member">
                                            <div className="user-image">
                                                <img src={_.get(member, 'avatar')} alt="Avatar"/>
                                                <span className={className('user-status', {'online': isOnline})} />
                                            </div>
                                            <div className="member-info">
                                    <h2>{member.name} | <span className={className('user-status', {'online': isOnline})}>{isOnline ? 'Online' : 'Offline'}</span></h2>
                                    <p>Joined: {moment(member.created).fromNow()}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                        </div> : null}
                        <div className="contact-email">Contact: <a href="mailto:chatqube@gmail.com">chatqube@gmail.com</a></div>
                    </div>
                </div>
            </div>
        )
    }
}

export default Messenger;