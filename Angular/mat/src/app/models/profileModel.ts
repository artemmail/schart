

export class ProfileModelParts
{
  color: boolean;
  width: boolean;
  font: boolean;
  id: boolean;
  text: boolean;
  arrow: boolean;
  profile: boolean;
  toolbar: boolean;
}

export class ProfileModel {
    mode: string ;
    profilePeriod: number;
    color: string;
    width: number;
    font: number;
    elementid: string;
    text: string;
    arrow: boolean;
    total: boolean;
    dockable: boolean;
    visible: ProfileModelParts;

    static createDefault(): ProfileModel {
      const model = new ProfileModel();
      model.mode = 'Edit';
      model.profilePeriod = -1;
      model.color = '#F08080';
      model.width = 3;
      model.font = 36;
      model.elementid = '';
      model.text = 'Some comment';
      model.arrow = false;
      model.total = true;
      model.dockable = true;
      model.visible = new ProfileModelParts();
      model.visible.toolbar = true;
      model.visible.color = false;
      model.visible.width = false;
      model.visible.font = false;
      model.visible.id = false;
      model.visible.text = false;
      model.visible.arrow = false;
      model.visible.profile = false;
      return model;
    }
};

