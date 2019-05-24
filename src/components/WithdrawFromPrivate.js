import React from 'react';
import Web3 from 'web3';
import { Scaler } from "dapparatus";
import Blockies from 'react-blockies';
import i18n from '../i18n';
import {
  Button,
  Input as RInput,
} from 'rimble-ui'

let pollInterval

export default class SendToAddress extends React.Component {

  constructor(props) {
    super(props);
    let initialState = {
      amount: "",//props.amount-0.01 ?
      privateKey: props.privateKey,
      canWithdraw: false,
    }

    let tempweb3 = new Web3();
    initialState.metaAccount = tempweb3.eth.accounts.privateKeyToAccount(props.privateKey);
    initialState.fromAddress = initialState.metaAccount.address.toLowerCase();

    this.state = initialState
    console.log("WithdrawFromPrivate constructor",this.state)
  }

  updateState = (key, value) => {
    this.setState({ [key]: value },()=>{
      this.setState({ canWithdraw: this.canWithdraw() })
    });
  };

  componentDidMount(){
    this.setState({ canWithdraw: this.canWithdraw() })
    pollInterval = setInterval(this.poll.bind(this),1500)
    setTimeout(this.poll.bind(this),250)
  }
  componentWillUnmount(){
    clearInterval(pollInterval)
  }

  async poll(){
    const { xdaiweb3, pdaiContract } = this.props;
    const { fromAddress } = this.state;
    let fromBalance = await pdaiContract.methods.balanceOf(fromAddress).call();

    fromBalance = parseFloat(xdaiweb3.utils.fromWei(fromBalance,'ether'))
    fromBalance = fromBalance.toFixed(2)
    console.log("from balance:",fromBalance,"of from address",fromAddress)

    if(typeof this.state.amount == "undefined"){
      this.setState({fromBalance,canWithdraw:this.canWithdraw(),amount:fromBalance})
    }else{
      this.setState({fromBalance,canWithdraw:this.canWithdraw()})
    }
  }

  canWithdraw() {
    return (parseFloat(this.state.amount) > 0 && parseFloat(this.state.amount) <= parseFloat(this.state.fromBalance))
  }

  withdraw = async () => {
    let { fromAddress, amount, metaAccount } = this.state
    const { tokenSendV2, address, web3, xdaiweb3, daiTokenAddr} = this.props

    if(this.state.canWithdraw){
        console.log("SWITCH TO LOADER VIEW...")
        this.props.changeView('loader')
        setTimeout(()=>{window.scrollTo(0,0)},60)
        //console.log("metaAccount",this.state.metaAccount,"amount",this.props.web3.utils.toWei(amount,'ether'))

        // NOTE: Amount needs to be cast to a string here.
        const weiAmount = web3.utils.toWei(""+amount, "ether")
        const color = await xdaiweb3.getColor(daiTokenAddr);

        try {
          await tokenSendV2(
            fromAddress,
            address,
            weiAmount,
            color,
            xdaiweb3,
            web3,
            metaAccount.privateKey
          )
        } catch(err) {
          this.props.goBack();
          window.history.pushState({},"", "/");
          this.props.changeAlert({
            type: 'warning',
            message: 'Transaction was rejected by the node. Please try again or contract an administrator.'
          });
          return;
        }

        this.props.goBack();
        window.history.pushState({},"", "/");
        this.props.changeAlert({
          type: 'success',
          message: 'Withdrawn!'
        });
    }else{
      this.props.changeAlert({type: 'warning', message: i18n.t('withdraw_from_private.error')})
    }
  };

  render() {
    let { canWithdraw, fromAddress } = this.state;

    let products = []
    for(let p in this.props.products){
      let prod = this.props.products[p]
      if(prod.exists){
        if(prod.isAvailable){
          let costInDollars = this.props.web3.utils.fromWei(prod.cost,'ether')
          products.push(
            <div key={p} className="content bridge row">
              <div className="col-12 p-1">
                <button className="btn btn-large w-100"
                  onClick={()=>{
                    console.log(prod.id,prod.name,prod.cost,prod.isAvailable)
                    let currentAmount = this.state.amount
                    if(currentAmount) currentAmount+=parseFloat(costInDollars)
                    else currentAmount = parseFloat(costInDollars)
                    if(currentAmount!==this.state.amount){
                      this.setState({amount:currentAmount})
                    }
                  }}
                  style={this.props.buttonStyle.secondary}>
                  <Scaler config={{startZoomAt:400,origin:"50% 50%"}}>
                    {this.props.web3.utils.hexToUtf8(prod.name)} {this.props.dollarDisplay(costInDollars)}
                  </Scaler>
                </button>
              </div>
            </div>
          )
        }

      }
    }
    if(products.length>0){
      products.push(
        <div key={"reset"} className="content bridge row">
          <div className="col-12 p-1">
            <button className="btn btn-large w-100"
              onClick={()=>{
                this.setState({amount:""})
              }}
              style={this.props.buttonStyle.secondary}>
              <Scaler config={{startZoomAt:400,origin:"50% 50%"}}>
                Reset
              </Scaler>
            </button>
          </div>
        </div>
      )
    }

    return (
      <div>
          <div className="content row">
            <div className="form-group w-100">
              <div className="form-group w-100">
                <label htmlFor="amount_input">{i18n.t('withdraw_from_private.from_address')}</label>
                <RInput
                  width={1}
                  type="text"
                  placeholder="0x..."
                  value={fromAddress} />
              </div>

              <div className="content bridge row">
                  <div className="col-6 p-1 w-100">
                    { <Blockies seed={fromAddress} scale={10} /> }
                  </div>
                  <div className="col-6 p-1 w-100">
                    <div style={{fontSize:64,letterSpacing:-2,fontWeight:500,whiteSpace:"nowrap"}}>
                      <Scaler config={{startZoomAt:1000,origin:"0% 50%"}}>
                        {this.props.dollarDisplay(this.state.fromBalance)}
                      </Scaler>
                    </div>
                  </div>
              </div>

              <label htmlFor="amount_input">{i18n.t('withdraw_from_private.amount')}</label>
              <div className="input-group">
                <RInput
                  width={1}
                  type="number"
                  placeholder="$0.00"
                  value={this.state.amount}
                  onChange={event => this.updateState('amount', event.target.value)} />
              </div>
              {products}
            </div>
            <Button
              size={'large'}
              width={1}
              disabled={!canWithdraw}
              onClick={this.withdraw}>
              {i18n.t('withdraw_from_private.withdraw')}
            </Button>
          </div>
      </div>
    )
  }
}
