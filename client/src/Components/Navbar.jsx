import React from 'react'

const Navbar = props => {
  return (
    <>
    <div className='navbar'>
        <div className='navBtn'>Market</div>
      
        { props.isConnected() ? (
            <div className='connectBtn'>
                Connected
            </div>
        ) : (
            <div className='connectBtn'
              onClick={() => props.connect()}
            >
                Connect
            </div>
        )}
    </div>
    </>
  )
}

export default Navbar