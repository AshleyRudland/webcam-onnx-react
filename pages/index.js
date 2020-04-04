import React, { useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { InferenceSession } from 'onnxjs';

import * as runModelUtils from '../runModel';
import * as imageProcessingUtils from '../imagePreprocessing';
import { getPredictedClass } from '../utils';

const INITIAL_STATE = {
  sessionRunning: false,
  inferenceTime: 0,
  error: false,
  output: [],
  modelLoading: false,
  modelLoaded: false,
  backendHint: null,
  selectedImage: null,
};

const WebcamCapture = ({ captureCb }) => {
  const webcamRef = useRef(null);

  const capture = useCallback(
    () => {
      const imageSrc = webcamRef.current.getScreenshot();
      captureCb(imageSrc);

      setTimeout(capture, 500);
    },
    [webcamRef]
  );

  // const videoWidth = process.browser && window ? window.innerWidth - 40 : 500;
  // const videoHeight = parseInt(videoWidth * 0.5625, 10);
  const videoWidth = 224;
  const videoHeight = 224;

  const videoConstraints = {
    width: videoWidth,
    height: videoHeight,
    facingMode: "user"
  };

  return (
    <div className="wrap">
      <Webcam
        audio={false}
        height={videoHeight}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={videoWidth}
        videoConstraints={videoConstraints}
      />
      <br />
      <button onClick={capture}>Start Realtime Model</button>
      <style jsx>{`
          button {
            outline: 0;
            border: none;
            padding: 6px 8px;
            background-color: #333;
            color: white;
            font-weight: 500;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .wrap {
            flex-direction: row;
          }
        `}</style>
    </div>
  );
};

export default class Index extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      ...INITIAL_STATE,
    };
    this.session = new InferenceSession({ backendHint: this.state.backendHint });
  }

  runModel = async () => {
    try {
      const element = document.getElementById('input-canvas');
      const ctx = element.getContext('2d'); 
      const preProcessedData = imageProcessingUtils.preProcess(ctx);
      if (!this.state.modelLoaded) {
        this.setState({
          modelLoading: true,
        });
        await this.session.loadModel('./squeezenet1_1.onnx');
        this.setState({
          modelLoaded: true,
          modelLoading: false,
        });
      }
      let [tensorOutput, inferenceTime] = await runModelUtils.runModel(this.session, preProcessedData);
      if (!!tensorOutput) {
        this.setState({
          output: getPredictedClass(tensorOutput.data),
          sessionRunning: false,
          inferenceTime,
        });
      }
    }
    catch(e) {
      console.warn(e);
    }
  }

  capture = (imageSrc) => {
    console.log('capture', imageSrc);

    var canvas = document.getElementById('input-canvas');
    var context = canvas.getContext('2d');
    var img = new Image();

    img.onload = (function(runModel) {
      context.drawImage(this, 0, 0, canvas.width, canvas.height);

      runModel();
    }).bind(img, this.runModel)

    img.src = imageSrc;
  }

  render() {
    const videoWidth = 224;
    const videoHeight = 224;  
    const { modelLoading, output, sessionRunning, inferenceTime } = this.state;

    return (
      <div className="wrapper">
        <h1>React (Next.js) + Webcam + ONNX Models </h1>
        <table>
          <tr>
            <td>Prediction:</td>
            <td>
              {modelLoading ? <p>Model is loading...</p> : null}
              {sessionRunning ? <p>Model is running on image...</p> : null}
              <p>{output && output[0] ? output[0].name : ''} {inferenceTime ? `took ${inferenceTime}ms` : ''}</p>              
            </td>
          </tr>
          <tr>
            <td>Raw Webcam Feed:</td>
            <td>
              <WebcamCapture captureCb={this.capture} />
            </td>
          </tr>
          <tr>
            <td>HTML5 Canvas:</td>
            <td>
              <canvas id="input-canvas" width={videoWidth} height={videoHeight} style={{ border: '1px solid red', width: videoWidth, height: videoHeight }} />              
            </td>
          </tr>          
        </table>
        <style jsx>{`
          *, body {
            font-family: BlinkMacSystemFont,-apple-system,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",Helvetica,Arial,sans-serif;
            text-align: center;
          }

          table {
            display: inline-block;
            margin: 0 auto;
          }

          table tr td:first-child {
            font-weight: bold;
            text-align: right;
          }
          table tr td{
            padding: 8px;
            text-align: left;
          }

          button {
            outline: 0;
            border: none;
            padding: 6px 8px;
            background-color: #333;
            color: white;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }
}