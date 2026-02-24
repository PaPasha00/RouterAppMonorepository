import { createControlComponent } from "@react-leaflet/core";
import L, { Control } from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw-src.css";

declare module "leaflet" {
  namespace Control {
    class Draw extends Control {
      constructor(options?: Control.DrawOptions);
    }
  }
}

interface LeafletDrawProps extends Control.DrawOptions {
  onCreated?: (e: L.DrawEvents.Created) => void;
  onEdited?: (e: L.DrawEvents.Edited) => void;
  onDeleted?: (e: L.DrawEvents.Deleted) => void;
}

const createDrawControl = (props: LeafletDrawProps) => {
  const { onCreated, onEdited, onDeleted, ...options } = props;

  const control = new L.Control.Draw(options);

  return control;
};

const LeafletDraw = createControlComponent(createDrawControl);

export default LeafletDraw;
