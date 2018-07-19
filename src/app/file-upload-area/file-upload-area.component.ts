import {Component, ElementRef,  HostBinding, Input, OnDestroy, OnInit, Optional, Self, ViewChild} from '@angular/core';
import {MatFormFieldControl} from '@angular/material';
import {Subject} from 'rxjs';
import {ControlValueAccessor, FormBuilder, NgControl} from '@angular/forms';
import {FocusMonitor} from '@angular/cdk/a11y';
import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {MyFileListInput} from './my-file-list.input';

/**
 * Upload view segment for uploading files for a form.
 * This works with formGroup!
 *
 * This component has 3 main parts.
 * 1. Base logic for file uploading
 * 2. formControl  implementation (Dynamic Forms compatibility, for instance we can use "formControlName" property)
 * 3. Angular Material coustom form field control (we can use <mat-form-field> around this)
 * guides to understand:
 * - https://material.angular.io/guide/creating-a-custom-form-field-control#-code-value-code-
 * - https://angular.io/api/forms/ControlValueAccessor
 *
 * @example
 *  <mat-form-field>
 *               <app-file-upload-area formControlName="files"></app-file-upload-area>
 *  </mat-form-field>
 */
@Component({
  selector: 'app-file-upload-area',
  templateUrl: './file-upload-area.component.html',
  styleUrls: ['./file-upload-area.component.css'],
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: FileUploadAreaComponent
    },
    // ControlValueAccessor is REMOVED, due to cyclic inject - instead, we use a singleton, see below
    // {
    //   provide: NG_VALUE_ACCESSOR,
    //   multi: true,
    //   useExisting: forwardRef(() => FileUploadAreaComponent),
    // }
  ],
})
export class FileUploadAreaComponent implements ControlValueAccessor, OnInit, OnDestroy, MatFormFieldControl<MyFileListInput> {
  static nextId = 0;

  /**
   * A hidden <input type="file" ...> field, that we use to trigger the file browsing
   */
  @ViewChild('fileInputElement') fileInputElement;

  /**
   * Local file object store. We use the MyFileListInput to wrap it outside this class.
   * @type {Set<any>}
   */
  public files: Set<File> = new Set();

  /**
   * MatFormField required object: tell the parent to run changeDetection
   * @type {Subject<void>}
   */
  stateChanges = new Subject<void>();

  /**
   * formControl required object: tell the controlGroup, that data is refreshed (so poll it)
   */
  _onChange: (_: any) => void;

  /**
   * MatFormField must have: custom ID generation
   * @type {number}
   */
  @HostBinding() id = `app-file-upload-area${FileUploadAreaComponent.nextId++}`;

  /**
   * MatFormField (required) self-explaining attributes
   */
  readonly autofilled: boolean;
  readonly placeholder: string;
  private _disabled = false;
  focused = false;
  errorState = false;
  controlType = 'app-file-upload-area';

  @HostBinding('attr.aria-describedby') describedBy = '';
  private _required = false;

  /**
   * Value setter and getter
   *
   * We need to implement stateChanges (Material) and call the formControl callback on change as well.
   * @returns {Set<File>}
   */
  @Input()
  get value() {
    // return this.files;
    return new MyFileListInput(this.files);
  }

  set value(val: MyFileListInput) {
    this.files = val.files;

    this.stateChanges.next();
    this._onChange(this.files);
  }

  /**
   * Return empty for Material
   * @returns {boolean}
   */
  get empty() {
    return (this.files.size < 1);
  }

  /**
   * The Material "floating label" effect, we do not really use this.
   * @returns {boolean}
   */
  @HostBinding('class.floating')
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  @Input()
  get required() {
    return this._required;
  }

  set required(req) {
    this._required = coerceBooleanProperty(req);
    this.stateChanges.next();
  }

  @Input()
  get disabled() {
    return this._disabled;
  }

  set disabled(dis) {
    this._disabled = coerceBooleanProperty(dis);
    this.stateChanges.next();
  }

  setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ');
  }

  onContainerClick(event: MouseEvent) {
    // todo: implement something?
  }


  /**
   * Here is the constructor, with the ngControl value accessor manual providing. (read the guide for more)
   * @param {NgControl} ngControl
   * @param {FormBuilder} fb
   * @param {FocusMonitor} fm
   * @param {ElementRef} elRef
   */
  constructor(@Optional() @Self() public ngControl: NgControl,
              fb: FormBuilder, private fm: FocusMonitor, private elRef: ElementRef) {
    fm.monitor(elRef.nativeElement, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });

    // // Setting the value accessor directly (instead of using
    // // the providers) to avoid running into a circular import.
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnInit() {
  }

  /**
   * Gets called when the user adds files to the input field.
   * We also trigger change detection here.
   */
  onFilesAdded() {
    const files: { [key: string]: File } = this.fileInputElement.nativeElement.files;
    for (const key in files) {
      if (!isNaN(parseInt(key, 10))) {
        this.files.add(files[key]);
      }
    }
    this.stateChanges.next();
    this._onChange(this.files);
  }

  /**
   * The real input is hidden: this button click calls it.
   */
  addFiles() {
    this.fileInputElement.nativeElement.click();
  }

  /**
   * Users can remove files via their chip X icons.
   * Triggering Change detection too
   * @param file
   */
  removeFile(file): void {
    const index = this.files.delete(file);
    this.stateChanges.next();
    this._onChange(this.files);
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this.fm.stopMonitoring(this.elRef.nativeElement);
  }


  /**
   * Some must-have functions for formControl .
   * @param {(_: any) => void} fn
   */
  registerOnChange(fn: (_: any) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  setDisabledState(isDisabled: boolean): void {
  }

  writeValue(obj: any): void {
  }


}
