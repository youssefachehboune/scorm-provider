# SCORM Provider

A React component for managing SCORM communication in web applications.

## Installation

```bash
npm install scorm-provider
```

## Usage
### 1. Import the SCORM Provider
```javascript
import ScormProvider, { ScoContext } from 'scorm-provider';
```
### 2. Wrap your App with ScormProvider
```javascript
import React from 'react';

const App = () => {
  return (
    <ScormProvider version="1.2" debug={true}>
      {/* Your application components go here */}
    </ScormProvider>
  );
};

export default App;
```
### 3. Use the SCORM Context
Access SCORM-related functionalities using the ScoContext in your components.

```javascript
import React, { useContext, useEffect } from 'react';
import { ScoContext } from 'scorm-provider';

const MyComponent = () => {
  const { scormState, getSuspendData, setStatus } = useContext(ScoContext);

  useEffect(() => {
    // Example: Get suspend data on component mount
    const fetchData = async () => {
      const suspendData = await getSuspendData();
      console.log('Suspend Data:', suspendData);
    };

    fetchData();
  }, []);

  // Example: Set completion status
  const handleComplete = async () => {
    await setStatus('completed');
  };

  return (
    <div>
      <p>Completion Status: {scormState.completionStatus}</p>
      <button onClick={handleComplete}>Complete Course</button>
    </div>
  );
};

export default MyComponent;
```
## Props
`version: string`
The SCORM version to use (e.g., "1.2" or "2004").

`debug: boolean`
Enable or disable debug mode. When true, additional logging is provided.

## API Reference
`ScoContext`
The context object providing access to SCORM-related functionalities.

`scormState`
An object containing the current state of the SCORM connection.

`getSuspendData(): Promise<any>`
Retrieve suspend data from the SCORM API.

`setStatus(status: string): Promise<any>`
Set the completion status in the SCORM API.

`ScormProvider`
A React component that wraps your application to manage the SCORM connection.

## Contributing
Feel free to contribute to this project by opening issues or submitting pull requests.