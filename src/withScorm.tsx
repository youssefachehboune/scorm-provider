import React from 'react';
import { ScoContext } from './scormProvider';

function withScorm() {

  return function(WrappedComponent: any) {

    const WithScorm = function(props: any) {
      return (
        <ScoContext.Consumer>
          {value => <WrappedComponent {...props} sco={value} />}
        </ScoContext.Consumer>
      )
    }

    return WithScorm;
  }
}

export default withScorm;